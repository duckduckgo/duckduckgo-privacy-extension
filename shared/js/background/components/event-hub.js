import browser from 'webextension-polyfill';
import { registerMessageHandler } from '../message-registry';
import { sendPixelRequest } from '../pixels';

/**
 * @typedef {import('./remote-config').default} RemoteConfig
 *
 * @typedef {{
 *   state?: string;
 *   settings?: {
 *     telemetry?: Record<string, TelemetryConfig>;
 *   };
 * }} EventHubFeatureConfig
 *
 * @typedef {{
 *   state?: string;
 *   trigger?: { period?: PeriodConfig };
 *   parameters?: Record<string, ParameterConfig>;
 * }} TelemetryConfig
 *
 * @typedef {{ seconds?: number; minutes?: number; hours?: number; days?: number }} PeriodConfig
 *
 * @typedef {{
 *   template: string;
 *   source: string;
 *   buckets?: Record<string, BucketConfig>;
 * }} ParameterConfig
 *
 * @typedef {{ gte: number; lt?: number }} BucketConfig
 *
 * @typedef {{
 *   pixelName: string;
 *   periodStartMillis: number;
 *   periodEndMillis: number;
 *   params: Record<string, CounterParamState>;
 *   config: TelemetryConfig;
 * }} PersistedPixelState
 *
 * @typedef {{ value: number; stopCounting: boolean }} CounterParamState
 */

export const STORAGE_KEY = 'eventHub_pixelState';
export const ALARM_PREFIX = 'eventHub_fire_';

/**
 * Converts a period config to seconds.
 * @param {PeriodConfig} period
 * @returns {number}
 */
export function periodToSeconds(period) {
    return (period.seconds || 0) + (period.minutes || 0) * 60 + (period.hours || 0) * 3600 + (period.days || 0) * 86400;
}

/**
 * Snaps a UTC timestamp (ms) down to the start of the period-sized interval from epoch.
 * @param {number} timestampMs
 * @param {PeriodConfig} period
 * @returns {number} Unix timestamp in seconds
 */
export function toStartOfInterval(timestampMs, period) {
    const periodSecs = periodToSeconds(period);
    if (periodSecs <= 0) return Math.floor(timestampMs / 1000);
    const epochSecs = Math.floor(timestampMs / 1000);
    return Math.floor(epochSecs / periodSecs) * periodSecs;
}

/**
 * Finds the matching bucket name for a count value.
 * @param {number} count
 * @param {Record<string, BucketConfig>} buckets
 * @returns {string | null}
 */
export function bucketCount(count, buckets) {
    for (const [name, bucket] of Object.entries(buckets)) {
        if (count < bucket.gte) continue;
        if (bucket.lt != null && count >= bucket.lt) continue;
        return name;
    }
    return null;
}

/**
 * Returns true if no future increment can move the count into a higher bucket.
 * @param {number} count
 * @param {Record<string, BucketConfig>} buckets
 * @returns {boolean}
 */
export function shouldStopCounting(count, buckets) {
    return !Object.values(buckets).some((bucket) => count < bucket.gte);
}

// --- Persistence helpers (chrome.storage.local) ---

/**
 * @returns {Promise<Record<string, PersistedPixelState>>}
 */
async function getAllPixelStates() {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || {};
}

/**
 * @param {string} pixelName
 * @returns {Promise<PersistedPixelState | null>}
 */
async function loadPixelState(pixelName) {
    const all = await getAllPixelStates();
    return all[pixelName] || null;
}

/**
 * @param {string} pixelName
 * @param {PersistedPixelState} state
 */
async function savePixelState(pixelName, state) {
    const all = await getAllPixelStates();
    all[pixelName] = state;
    await browser.storage.local.set({ [STORAGE_KEY]: all });
}

/**
 * @param {string} pixelName
 */
async function deletePixelState(pixelName) {
    const all = await getAllPixelStates();
    delete all[pixelName];
    await browser.storage.local.set({ [STORAGE_KEY]: all });
}

async function deleteAllPixelStates() {
    await browser.storage.local.remove(STORAGE_KEY);
}

// --- Alarm helpers ---

/**
 * @param {string} pixelName
 * @param {number} fireTimeMs - absolute time in ms
 */
async function scheduleAlarm(pixelName, fireTimeMs) {
    const alarmName = ALARM_PREFIX + pixelName;
    await browser.alarms.create(alarmName, { when: fireTimeMs });
}

/**
 * @param {string} pixelName
 */
async function cancelAlarm(pixelName) {
    await browser.alarms.clear(ALARM_PREFIX + pixelName);
}

async function cancelAllEventHubAlarms() {
    const alarms = await browser.alarms.getAll();
    await Promise.all(alarms.filter((a) => a.name.startsWith(ALARM_PREFIX)).map((a) => browser.alarms.clear(a.name)));
}

export default class EventHub {
    /**
     * @param {{
     *   remoteConfig: RemoteConfig;
     * }} opts
     */
    constructor({ remoteConfig }) {
        this.remoteConfig = remoteConfig;

        /** @type {EventHubFeatureConfig | null} */
        this._config = null;

        /** @type {Set<string>} registered telemetry names with active periods */
        this._registeredTelemetry = new Set();

        // In-memory dedup state
        /** @type {Set<string>} */
        this._dedupSeen = new Set();
        /** @type {Map<string, string>} tabId -> currentUrl */
        this._tabCurrentUrl = new Map();

        // Listen for config updates
        this.remoteConfig.onUpdate(async () => {
            this._onConfigChanged();
        });

        // Listen for alarms
        browser.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name.startsWith(ALARM_PREFIX)) {
                const pixelName = alarm.name.slice(ALARM_PREFIX.length);
                this._fireTelemetry(pixelName);
            }
        });

        // Navigation tracking for dedup
        browser.webNavigation.onBeforeNavigate.addListener((details) => {
            if (details.frameId !== 0) return;
            this._onNavigationStarted(details.tabId.toString(), details.url);
        });

        // Tab closure cleanup
        browser.tabs.onRemoved.addListener((tabId) => {
            this._onTabClosed(tabId.toString());
        });

        // Register webEvent message handler
        registerMessageHandler('webEvent', (options, sender) => {
            const type = options?.type;
            if (!type) return;
            const tabId = sender?.tab?.id?.toString();
            this._handleWebEvent(type, tabId);
        });

        // Restore persisted state on startup
        this.ready = this._restore();
    }

    // --- Config handling ---

    /**
     * Reads the current eventHub config from remoteConfig.
     * @returns {EventHubFeatureConfig | null}
     */
    _readConfig() {
        if (!this.remoteConfig.isFeatureEnabled('eventHub')) {
            return null;
        }
        const settings = this.remoteConfig.getFeatureSettings('eventHub');
        return {
            state: 'enabled',
            settings,
        };
    }

    /** @returns {boolean} */
    _isEnabled() {
        return this._config?.state === 'enabled';
    }

    /**
     * @returns {Record<string, TelemetryConfig>}
     */
    _getTelemetryConfigs() {
        return this._config?.settings?.telemetry || {};
    }

    async _onConfigChanged() {
        this._config = this._readConfig();

        if (!this._isEnabled()) {
            await this._onDisable();
            return;
        }

        const telemetryConfigs = this._getTelemetryConfigs();
        for (const name of Object.keys(telemetryConfigs)) {
            if (!this._registeredTelemetry.has(name)) {
                await this._registerTelemetry(name);
            }
        }
    }

    // --- Telemetry lifecycle ---

    /**
     * @param {string} name
     */
    async _registerTelemetry(name) {
        if (!this._isEnabled()) return;

        const telemetryConfigs = this._getTelemetryConfigs();
        const config = telemetryConfigs[name];
        if (!config) return;
        if (this._registeredTelemetry.has(name)) return;
        if (config.state !== 'enabled') return;

        this._registeredTelemetry.add(name);
        await this._startNewPeriod(name, config);
    }

    /**
     * Start a new collection period for a telemetry pixel.
     * @param {string} name
     * @param {TelemetryConfig} config
     */
    async _startNewPeriod(name, config) {
        const period = config.trigger?.period;
        if (!period) return;

        const periodMs = periodToSeconds(period) * 1000;
        if (periodMs <= 0) return;

        const now = Date.now();
        const periodEnd = now + periodMs;

        /** @type {Record<string, CounterParamState>} */
        const params = {};
        if (config.parameters) {
            for (const [paramName, param] of Object.entries(config.parameters)) {
                if (param.template === 'counter') {
                    params[paramName] = { value: 0, stopCounting: false };
                }
            }
        }

        /** @type {PersistedPixelState} */
        const state = {
            pixelName: name,
            periodStartMillis: now,
            periodEndMillis: periodEnd,
            params,
            config,
        };

        await savePixelState(name, state);
        await scheduleAlarm(name, periodEnd);
    }

    async _onDisable() {
        await cancelAllEventHubAlarms();
        await deleteAllPixelStates();
        this._registeredTelemetry.clear();
    }

    /**
     * @param {string} name
     */
    async _deregisterTelemetry(name) {
        if (!this._registeredTelemetry.has(name)) return;
        await cancelAlarm(name);
        await deletePixelState(name);
        this._registeredTelemetry.delete(name);
    }

    // --- Event handling ---

    /**
     * @param {string} eventType
     * @param {string | undefined} tabId
     */
    async _handleWebEvent(eventType, tabId) {
        if (!this._isEnabled()) return;

        for (const name of this._registeredTelemetry) {
            const state = await loadPixelState(name);
            if (!state) continue;

            if (Date.now() > state.periodEndMillis) continue;

            const configParams = state.config.parameters || {};

            for (const [paramName, paramConfig] of Object.entries(configParams)) {
                if (paramConfig.template !== 'counter') continue;
                if (paramConfig.source !== eventType) continue;

                const paramState = state.params[paramName];
                if (!paramState) continue;
                if (paramState.stopCounting) continue;

                if (this._isDuplicateEvent(name, paramName, eventType, tabId)) continue;

                if (shouldStopCounting(paramState.value, paramConfig.buckets || {})) {
                    paramState.stopCounting = true;
                    await savePixelState(name, state);
                    continue;
                }

                paramState.value += 1;
                await savePixelState(name, state);
            }
        }
    }

    // --- Dedup ---

    /**
     * @param {string} pixelName
     * @param {string} paramName
     * @param {string} source
     * @param {string | undefined} tabId
     * @returns {boolean}
     */
    _isDuplicateEvent(pixelName, paramName, source, tabId) {
        if (!tabId) return false;

        const key = `${pixelName}:${paramName}:${source}:${tabId}`;
        if (this._dedupSeen.has(key)) return true;

        this._dedupSeen.add(key);
        return false;
    }

    /**
     * @param {string} tabId
     * @param {string} url
     */
    _onNavigationStarted(tabId, url) {
        if (!tabId || !url) return;
        const previousUrl = this._tabCurrentUrl.get(tabId);
        this._tabCurrentUrl.set(tabId, url);
        if (previousUrl && previousUrl !== url) {
            this._clearDedupForTab(tabId);
        }
    }

    /**
     * @param {string} tabId
     */
    _onTabClosed(tabId) {
        this._tabCurrentUrl.delete(tabId);
        this._clearDedupForTab(tabId);
    }

    /**
     * @param {string} tabId
     */
    _clearDedupForTab(tabId) {
        const suffix = `:${tabId}`;
        for (const key of this._dedupSeen) {
            if (key.endsWith(suffix)) {
                this._dedupSeen.delete(key);
            }
        }
    }

    // --- Pixel firing ---

    /**
     * @param {string} telemetryName
     */
    async _fireTelemetry(telemetryName) {
        if (!this._isEnabled()) return;

        const state = await loadPixelState(telemetryName);
        if (!state) return;

        this._firePixelFromState(state);

        await deletePixelState(telemetryName);
        this._registeredTelemetry.delete(telemetryName);

        // Consult latest live config for next period
        this._config = this._readConfig();
        if (!this._isEnabled()) return;

        const telemetryConfigs = this._getTelemetryConfigs();
        const latestConfig = telemetryConfigs[telemetryName];
        if (latestConfig && latestConfig.state === 'enabled') {
            this._registeredTelemetry.add(telemetryName);
            await this._startNewPeriod(telemetryName, latestConfig);
        }
    }

    /**
     * Builds and fires a pixel from persisted state.
     * @param {PersistedPixelState} state
     */
    _firePixelFromState(state) {
        const config = state.config;
        const period = config.trigger?.period;
        if (!period) return;

        /** @type {Record<string, string>} */
        const pixelParams = {};
        let hasParams = false;

        const configParams = config.parameters || {};
        for (const [paramName, paramConfig] of Object.entries(configParams)) {
            if (paramConfig.template === 'counter') {
                const paramState = state.params[paramName];
                if (!paramState) continue;
                const bucket = bucketCount(paramState.value, paramConfig.buckets || {});
                if (bucket != null) {
                    pixelParams[paramName] = bucket;
                    hasParams = true;
                }
            }
        }

        if (!hasParams) return;

        pixelParams.attributionPeriod = String(toStartOfInterval(state.periodStartMillis, period));

        sendPixelRequest(state.pixelName, pixelParams);
    }

    // --- Restore / checkPixels ---

    /**
     * Called on service worker startup to restore state and re-arm timers.
     */
    async _restore() {
        await this.remoteConfig.ready;

        this._config = this._readConfig();
        if (!this._isEnabled()) return;

        const allStates = await getAllPixelStates();
        const now = Date.now();

        for (const [pixelName, state] of Object.entries(allStates)) {
            this._registeredTelemetry.add(pixelName);
            if (now >= state.periodEndMillis) {
                await this._fireTelemetry(pixelName);
            } else {
                await scheduleAlarm(pixelName, state.periodEndMillis);
            }
        }

        // Pick up any enabled configs that have no active state
        const telemetryConfigs = this._getTelemetryConfigs();
        for (const [name, config] of Object.entries(telemetryConfigs)) {
            if (config.state !== 'enabled') continue;
            const existing = await loadPixelState(name);
            if (!existing) {
                this._registeredTelemetry.add(name);
                await this._startNewPeriod(name, config);
            }
        }
    }
}
