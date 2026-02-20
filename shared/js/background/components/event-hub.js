/* global BUILD_TARGET */
import browser from 'webextension-polyfill';
import { sendPixelRequest } from '../pixels';
import { registerMessageHandler } from '../message-registry';

/**
 * @typedef {import('./remote-config').default} RemoteConfig
 * @typedef {import('../settings')} Settings
 *
 * @typedef {{seconds?: number, minutes?: number, hours?: number, days?: number}} Period
 *
 * @typedef {{minInclusive: number, maxExclusive?: number, name: string}} Bucket
 *
 * @typedef {{
 *   template: 'counter',
 *   source: string,
 *   buckets: Bucket[]
 * }} CounterParameterConfig
 *
 * @typedef {{
 *   template: 'counter',
 *   data: number,
 *   source: string,
 *   buckets: Bucket[],
 *   stopCounting: boolean
 * }} CounterParameterState
 *
 * @typedef {{
 *   state: string,
 *   trigger: { period: Period },
 *   parameters: Record<string, CounterParameterConfig>
 * }} TelemetryConfig
 *
 * @typedef {{
 *   name: string,
 *   periodStart: number,
 *   periodEnd: number,
 *   period: Period,
 *   parameters: Record<string, CounterParameterState>
 * }} PersistedTelemetry
 *
 * @typedef {{
 *   state?: string,
 *   settings?: { telemetry?: Record<string, TelemetryConfig> }
 * }} EventHubFeatureConfig
 */

const ALARM_PREFIX = 'eventHub:fire:';
const SETTINGS_KEY = 'eventHub.telemetry';

/**
 * Convert a period object to total seconds.
 * @param {Period} period
 * @returns {number}
 */
export function periodToSeconds(period) {
    return (period.seconds || 0) + (period.minutes || 0) * 60 + (period.hours || 0) * 3600 + (period.days || 0) * 86400;
}

/**
 * Snap a UTC timestamp (in seconds) down to the start of the interval it falls in.
 * @param {number} epochSecs
 * @param {Period} period
 * @returns {number}
 */
export function toStartOfInterval(epochSecs, period) {
    const periodSecs = periodToSeconds(period);
    if (periodSecs <= 0) return epochSecs;
    return Math.floor(epochSecs / periodSecs) * periodSecs;
}

/**
 * Calculate the attribution period: the start of the period in which
 * the attribution window closes, as a UTC Unix timestamp (seconds).
 * @param {number} startTimeSecs - UTC epoch seconds when collection started
 * @param {Period} period
 * @returns {number}
 */
export function calculateAttributionPeriod(startTimeSecs, period) {
    const periodSecs = periodToSeconds(period);
    return toStartOfInterval(startTimeSecs, period) + periodSecs;
}

/**
 * Find the first matching bucket for a given count.
 * @param {number} count
 * @param {Bucket[]} buckets
 * @returns {Bucket | null}
 */
export function bucketCount(count, buckets) {
    for (const bucket of buckets) {
        if (count >= bucket.minInclusive) {
            if (bucket.maxExclusive == null || count < bucket.maxExclusive) {
                return bucket;
            }
        }
    }
    return null;
}

export default class EventHub {
    /**
     * @param {{
     *   remoteConfig: RemoteConfig,
     *   settings: Settings
     * }} opts
     */
    constructor({ remoteConfig, settings }) {
        this.remoteConfig = remoteConfig;
        this.settings = settings;
        /** @type {Map<string, TelemetryInstance>} */
        this.telemetry = new Map();
        /** @type {Map<string, number>} -- alarm timer IDs (setTimeout handles) */
        this.timers = new Map();
        /** @type {EventHubFeatureConfig | null} */
        this.config = null;
        /**
         * Track seen event types per tab to de-duplicate counter events across frames.
         * Map<tabId, Set<eventType>>
         * @type {Map<number, Set<string>>}
         */
        this.seenEventsPerTab = new Map();

        if (BUILD_TARGET === 'firefox') return;

        registerMessageHandler('webEvent', (data, sender) => this.handleWebEventMessage(data, sender));

        browser.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name.startsWith(ALARM_PREFIX)) {
                const telemetryName = alarm.name.slice(ALARM_PREFIX.length);
                this.fireTelemetry(telemetryName);
            }
        });

        browser.webNavigation.onBeforeNavigate.addListener((details) => {
            if (details.frameId === 0) {
                this.seenEventsPerTab.delete(details.tabId);
            }
        });

        browser.tabs.onRemoved.addListener((tabId) => {
            this.seenEventsPerTab.delete(tabId);
        });

        this._initFromConfig();
    }

    /**
     * Load config once remoteConfig is ready, and subscribe to updates.
     */
    async _initFromConfig() {
        await /** @type {RemoteConfig} */ (this.remoteConfig).ready;
        this._loadConfig();
        /** @type {RemoteConfig} */ (this.remoteConfig).onUpdate(() => {
            this._loadConfig();
        });
    }

    _loadConfig() {
        const rc = /** @type {RemoteConfig} */ (this.remoteConfig);
        const feature = rc.config?.features?.eventHub || null;
        const newConfig = feature
            ? /** @type {EventHubFeatureConfig} */ ({
                  state: feature.state,
                  settings: feature.settings,
              })
            : null;
        this.onConfigChanged(newConfig);
    }

    /**
     * @param {EventHubFeatureConfig | null} config
     */
    onConfigChanged(config) {
        const previousConfig = this.config ? JSON.stringify(this.config) : null;
        const newConfigStr = config ? JSON.stringify(config) : null;
        if (previousConfig === newConfigStr) return;

        this.config = config;

        if (!this._isEnabled()) {
            this._onDisable();
            return;
        }

        const telemetryDefs = this.config?.settings?.telemetry || {};
        for (const name of Object.keys(telemetryDefs)) {
            if (!this.telemetry.has(name)) {
                this._registerTelemetry(name);
            }
        }
    }

    /**
     * @returns {boolean}
     */
    _isEnabled() {
        return this.config?.state === 'enabled';
    }

    /**
     * @param {string} name
     */
    _registerTelemetry(name) {
        if (!this._isEnabled()) return;
        const telemetryDefs = this.config?.settings?.telemetry;
        if (!telemetryDefs || !(name in telemetryDefs)) return;
        if (this.telemetry.has(name)) return;
        if (telemetryDefs[name].state !== 'enabled') return;

        const telConfig = telemetryDefs[name];
        const instance = new TelemetryInstance(name, telConfig);
        this.telemetry.set(name, instance);
        this._restoreOrStartTelemetry(instance);
    }

    /**
     * Attempt to restore persisted state; otherwise start fresh.
     * @param {TelemetryInstance} instance
     */
    _restoreOrStartTelemetry(instance) {
        const persisted = this._getPersistedState();
        const saved = persisted[instance.name];
        if (saved && saved.periodStart && saved.periodEnd) {
            instance.periodStart = saved.periodStart;
            instance.periodEnd = saved.periodEnd;
            instance.period = saved.period;
            for (const [pName, pState] of Object.entries(saved.parameters)) {
                instance.parameters.set(pName, pState);
            }
            const now = Date.now() / 1000;
            if (now >= instance.periodEnd) {
                this.fireTelemetry(instance.name);
                return;
            }
        } else {
            instance.start();
        }
        this._persistState();
        this._scheduleFireTelemetry(/** @type {number} */ (instance.periodEnd), instance.name);
    }

    /**
     * @param {string} name
     */
    _deregisterTelemetry(name) {
        const instance = this.telemetry.get(name);
        if (!instance) return;
        this._cancelTimer(name);
        this.telemetry.delete(name);
        this._removePersistedTelemetry(name);
    }

    _onDisable() {
        for (const name of [...this.timers.keys()]) {
            this._cancelTimer(name);
        }
        for (const name of [...this.telemetry.keys()]) {
            this._deregisterTelemetry(name);
        }
    }

    /**
     * @param {number} timeEpochSecs - UTC epoch seconds when to fire
     * @param {string} telemetryName
     */
    _scheduleFireTelemetry(timeEpochSecs, telemetryName) {
        if (this.timers.has(telemetryName)) return;
        if (!this.telemetry.has(telemetryName)) return;

        const alarmName = ALARM_PREFIX + telemetryName;
        const whenMs = timeEpochSecs * 1000;

        browser.alarms.create(alarmName, { when: whenMs });
        this.timers.set(telemetryName, whenMs);
    }

    /**
     * @param {string} telemetryName
     */
    _cancelTimer(telemetryName) {
        const alarmName = ALARM_PREFIX + telemetryName;
        browser.alarms.clear(alarmName);
        this.timers.delete(telemetryName);
    }

    /**
     * @param {string} telemetryName
     */
    fireTelemetry(telemetryName) {
        if (!this._isEnabled()) return;
        if (!this.telemetry.has(telemetryName)) return;

        this._cancelTimer(telemetryName);
        const instance = /** @type {TelemetryInstance} */ (this.telemetry.get(telemetryName));
        instance.fire();

        this._deregisterTelemetry(telemetryName);
        this._registerTelemetry(telemetryName);
    }

    /**
     * Handle a webEvent message from C-S-S.
     * @param {{type: string, data?: any}} data
     * @param {import('webextension-polyfill').Runtime.MessageSender} sender
     */
    handleWebEventMessage(data, sender) {
        if (!this._isEnabled()) return;
        if (!data || !data.type) return;

        const tabId = sender?.tab?.id;

        for (const instance of this.telemetry.values()) {
            instance.handleEvent(data, tabId, this.seenEventsPerTab);
        }
        this._persistState();
    }

    // -- Persistence helpers --

    /**
     * @returns {Record<string, PersistedTelemetry>}
     */
    _getPersistedState() {
        return this.settings.getSetting(SETTINGS_KEY) || {};
    }

    _persistState() {
        /** @type {Record<string, PersistedTelemetry>} */
        const state = {};
        for (const [name, instance] of this.telemetry) {
            state[name] = instance.serialize();
        }
        this.settings.updateSetting(SETTINGS_KEY, state);
    }

    /**
     * @param {string} name
     */
    _removePersistedTelemetry(name) {
        const state = this._getPersistedState();
        delete state[name];
        this.settings.updateSetting(SETTINGS_KEY, state);
    }
}

export class TelemetryInstance {
    /**
     * @param {string} name
     * @param {TelemetryConfig} config
     */
    constructor(name, config) {
        this.name = name;
        this.period = config.trigger.period;
        /** @type {number | null} */
        this.periodStart = null;
        /** @type {number | null} */
        this.periodEnd = null;
        /** @type {Map<string, CounterParameterState>} */
        this.parameters = new Map();

        for (const [paramName, param] of Object.entries(config.parameters || {})) {
            this._initialiseParameter(paramName, param);
        }
    }

    start() {
        this.periodStart = Math.floor(Date.now() / 1000);
        this.periodEnd = this.periodStart + periodToSeconds(this.period);
    }

    /**
     * @param {string} paramName
     * @param {CounterParameterConfig} param
     */
    _initialiseParameter(paramName, param) {
        if (param.template === 'counter') {
            this.parameters.set(paramName, {
                template: 'counter',
                data: 0,
                source: param.source,
                buckets: param.buckets,
                stopCounting: false,
            });
        }
    }

    /**
     * @param {{type: string, data?: any}} event
     * @param {number | undefined} tabId
     * @param {Map<number, Set<string>>} seenEventsPerTab
     */
    handleEvent(event, tabId, seenEventsPerTab) {
        if (this.periodStart == null || this.periodEnd == null) return;
        if (Date.now() / 1000 > this.periodEnd) return;

        for (const param of this.parameters.values()) {
            if (param.template === 'counter' && param.source === event.type) {
                if (param.stopCounting) continue;

                if (tabId != null) {
                    if (!seenEventsPerTab.has(tabId)) {
                        seenEventsPerTab.set(tabId, new Set());
                    }
                    const seen = /** @type {Set<string>} */ (seenEventsPerTab.get(tabId));
                    if (seen.has(event.type)) continue;
                    seen.add(event.type);
                }

                param.data += 1;

                if (!param.buckets.some((b) => param.data < b.minInclusive)) {
                    param.stopCounting = true;
                }
            }
        }
    }

    fire() {
        if (this.periodStart == null || this.periodEnd == null) return;

        const pixelData = this._buildPixel();
        if (Object.keys(pixelData).length === 0) return;

        const attributionPeriod = calculateAttributionPeriod(this.periodStart, this.period);
        pixelData.attributionPeriod = String(attributionPeriod);
        sendPixelRequest(this.name, pixelData);
    }

    /**
     * @returns {Record<string, string>}
     */
    _buildPixel() {
        /** @type {Record<string, string>} */
        const params = {};
        for (const [paramName, param] of this.parameters) {
            if (param.template === 'counter') {
                const bucket = bucketCount(param.data, param.buckets);
                if (bucket) {
                    params[paramName] = bucket.name;
                }
            }
        }
        return params;
    }

    /**
     * @returns {PersistedTelemetry}
     */
    serialize() {
        /** @type {Record<string, CounterParameterState>} */
        const params = {};
        for (const [name, state] of this.parameters) {
            params[name] = { ...state };
        }
        return {
            name: this.name,
            periodStart: this.periodStart || 0,
            periodEnd: this.periodEnd || 0,
            period: this.period,
            parameters: params,
        };
    }
}
