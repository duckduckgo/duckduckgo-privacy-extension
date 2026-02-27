import browser from 'webextension-polyfill';
import EventHub from '../../shared/js/background/components/event-hub';

describe('EventHub', () => {
    /** @type {EventHub} */
    let eventHub;
    /** @type {Record<string, any>} */
    let storageData;
    /** @type {Record<string, any>} */
    let alarmListeners;
    /** @type {Function[]} */
    let onAlarmCallbacks;
    /** @type {Function[]} */
    let onBeforeNavigateCallbacks;
    /** @type {Function[]} */
    let tabRemovedCallbacks;
    /** @type {Function} */
    let registeredWebEventHandler;
    /** @type {string[]} */
    let firedPixels;
    /** @type {Function[]} */
    let configUpdateCallbacks;

    const STORAGE_KEY = 'eventHub_pixelState';

    function makeRemoteConfig({ enabled = true, telemetry = {} } = {}) {
        configUpdateCallbacks = [];
        return {
            ready: Promise.resolve(),
            isFeatureEnabled(name) {
                return name === 'eventHub' && enabled;
            },
            getFeatureSettings(name) {
                if (name === 'eventHub') {
                    return { telemetry };
                }
                return {};
            },
            onUpdate(cb) {
                configUpdateCallbacks.push(cb);
            },
        };
    }

    function makeTelemetryConfig({ state = 'enabled', period = { days: 1 }, source = 'adwall', buckets = null } = {}) {
        if (!buckets) {
            buckets = {
                0: { gte: 0, lt: 1 },
                '1-2': { gte: 1, lt: 3 },
                '3-5': { gte: 3, lt: 6 },
                '6-10': { gte: 6, lt: 11 },
                '11-20': { gte: 11, lt: 21 },
                '21-39': { gte: 21, lt: 40 },
                '40+': { gte: 40 },
            };
        }
        return {
            state,
            trigger: { period },
            parameters: {
                count: {
                    template: 'counter',
                    source,
                    buckets,
                },
            },
        };
    }

    beforeEach(() => {
        storageData = {};
        alarmListeners = {};
        onAlarmCallbacks = [];
        onBeforeNavigateCallbacks = [];
        tabRemovedCallbacks = [];
        firedPixels = [];
        registeredWebEventHandler = null;

        spyOn(browser.storage.local, 'get').and.callFake(async (key) => {
            return { [key]: storageData[key] || undefined };
        });
        spyOn(browser.storage.local, 'set').and.callFake(async (data) => {
            Object.assign(storageData, data);
        });
        spyOn(browser.storage.local, 'remove').and.callFake(async (key) => {
            delete storageData[key];
        });

        spyOn(browser.alarms, 'create').and.callFake(async (name, info) => {
            alarmListeners[name] = info;
        });
        spyOn(browser.alarms, 'clear').and.callFake(async (name) => {
            delete alarmListeners[name];
            return true;
        });
        spyOn(browser.alarms, 'getAll').and.callFake(async () => {
            return Object.entries(alarmListeners).map(([name, info]) => ({ name, ...info }));
        });
        spyOn(browser.alarms.onAlarm, 'addListener').and.callFake((cb) => {
            onAlarmCallbacks.push(cb);
        });

        spyOn(browser.webNavigation.onBeforeNavigate, 'addListener').and.callFake((cb) => {
            onBeforeNavigateCallbacks.push(cb);
        });
        spyOn(browser.tabs.onRemoved, 'addListener').and.callFake((cb) => {
            tabRemovedCallbacks.push(cb);
        });
    });

    function createEventHub(config) {
        // Intercept registerMessageHandler
        const origModule = require('../../shared/js/background/message-handlers');
        spyOn(origModule, 'registerMessageHandler').and.callFake((name, handler) => {
            if (name === 'webEvent') {
                registeredWebEventHandler = handler;
            }
        });

        // Intercept sendPixelRequest
        const pixelsModule = require('../../shared/js/background/pixels');
        spyOn(pixelsModule, 'sendPixelRequest').and.callFake((name, params) => {
            firedPixels.push({ name, params });
        });

        eventHub = new EventHub({ remoteConfig: config });
    }

    describe('initialization', () => {
        it('should register message handler and listeners', async () => {
            const remoteConfig = makeRemoteConfig({ enabled: false });
            createEventHub(remoteConfig);
            await eventHub.ready;

            expect(registeredWebEventHandler).toBeTruthy();
            expect(onAlarmCallbacks.length).toBeGreaterThan(0);
            expect(onBeforeNavigateCallbacks.length).toBeGreaterThan(0);
            expect(tabRemovedCallbacks.length).toBeGreaterThan(0);
        });

        it('should not start telemetry when feature is disabled', async () => {
            const remoteConfig = makeRemoteConfig({ enabled: false });
            createEventHub(remoteConfig);
            await eventHub.ready;

            expect(Object.keys(alarmListeners).length).toBe(0);
        });

        it('should start telemetry when feature is enabled', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig(),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            expect(Object.keys(alarmListeners).length).toBe(1);
            expect(alarmListeners.eventHub_fire_webTelemetry_adwallDetection_day).toBeDefined();
        });
    });

    describe('config changes', () => {
        it('should register new telemetry on config change', async () => {
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry: {} });
            createEventHub(remoteConfig);
            await eventHub.ready;

            expect(Object.keys(alarmListeners).length).toBe(0);

            // Update config to add telemetry
            remoteConfig.getFeatureSettings = () => ({
                telemetry: { webTelemetry_adwallDetection_day: makeTelemetryConfig() },
            });

            for (const cb of configUpdateCallbacks) {
                await cb();
            }

            expect(Object.keys(alarmListeners).length).toBe(1);
        });

        it('should disable all telemetry when feature is disabled', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig(),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            expect(Object.keys(alarmListeners).length).toBe(1);

            // Disable the feature
            remoteConfig.isFeatureEnabled = () => false;
            for (const cb of configUpdateCallbacks) {
                await cb();
            }

            expect(Object.keys(alarmListeners).length).toBe(0);
            expect(storageData[STORAGE_KEY]).toBeUndefined();
        });
    });

    describe('event handling', () => {
        it('should increment counter for matching events', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig({ source: 'adwall' }),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            registeredWebEventHandler({ type: 'adwall' }, { tab: { id: 1 } });
            await new Promise((resolve) => setTimeout(resolve, 10));

            const state = storageData[STORAGE_KEY]?.webTelemetry_adwallDetection_day;
            expect(state).toBeDefined();
            expect(state.params.count.value).toBe(1);
        });

        it('should not increment counter for non-matching events', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig({ source: 'adwall' }),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            registeredWebEventHandler({ type: 'someOtherEvent' }, { tab: { id: 1 } });
            await new Promise((resolve) => setTimeout(resolve, 10));

            const state = storageData[STORAGE_KEY]?.webTelemetry_adwallDetection_day;
            expect(state.params.count.value).toBe(0);
        });
    });

    describe('deduplication', () => {
        it('should deduplicate events from the same tab on the same page', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig(),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            const sender = { tab: { id: 1 } };
            registeredWebEventHandler({ type: 'adwall' }, sender);
            await new Promise((resolve) => setTimeout(resolve, 10));
            registeredWebEventHandler({ type: 'adwall' }, sender);
            await new Promise((resolve) => setTimeout(resolve, 10));
            registeredWebEventHandler({ type: 'adwall' }, sender);
            await new Promise((resolve) => setTimeout(resolve, 10));

            const state = storageData[STORAGE_KEY]?.webTelemetry_adwallDetection_day;
            expect(state.params.count.value).toBe(1);
        });

        it('should count events from different tabs separately', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig(),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            registeredWebEventHandler({ type: 'adwall' }, { tab: { id: 1 } });
            await new Promise((resolve) => setTimeout(resolve, 10));
            registeredWebEventHandler({ type: 'adwall' }, { tab: { id: 2 } });
            await new Promise((resolve) => setTimeout(resolve, 10));

            const state = storageData[STORAGE_KEY]?.webTelemetry_adwallDetection_day;
            expect(state.params.count.value).toBe(2);
        });

        it('should clear dedup on navigation to a different URL', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig(),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            const sender = { tab: { id: 1 } };

            // Simulate navigation
            for (const cb of onBeforeNavigateCallbacks) {
                cb({ frameId: 0, tabId: 1, url: 'https://example.com/page-a' });
            }

            registeredWebEventHandler({ type: 'adwall' }, sender);
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Navigate to a different page
            for (const cb of onBeforeNavigateCallbacks) {
                cb({ frameId: 0, tabId: 1, url: 'https://example.com/page-b' });
            }

            registeredWebEventHandler({ type: 'adwall' }, sender);
            await new Promise((resolve) => setTimeout(resolve, 10));

            const state = storageData[STORAGE_KEY]?.webTelemetry_adwallDetection_day;
            expect(state.params.count.value).toBe(2);
        });

        it('should not clear dedup on same-URL reload', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig(),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            const sender = { tab: { id: 1 } };

            for (const cb of onBeforeNavigateCallbacks) {
                cb({ frameId: 0, tabId: 1, url: 'https://example.com/page-a' });
            }

            registeredWebEventHandler({ type: 'adwall' }, sender);
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Same URL navigation (reload)
            for (const cb of onBeforeNavigateCallbacks) {
                cb({ frameId: 0, tabId: 1, url: 'https://example.com/page-a' });
            }

            registeredWebEventHandler({ type: 'adwall' }, sender);
            await new Promise((resolve) => setTimeout(resolve, 10));

            const state = storageData[STORAGE_KEY]?.webTelemetry_adwallDetection_day;
            expect(state.params.count.value).toBe(1);
        });

        it('should clear dedup state on tab close', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig(),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            registeredWebEventHandler({ type: 'adwall' }, { tab: { id: 1 } });
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Close and reopen tab
            for (const listener of tabRemovedCallbacks) {
                listener(1);
            }

            registeredWebEventHandler({ type: 'adwall' }, { tab: { id: 1 } });
            await new Promise((resolve) => setTimeout(resolve, 10));

            const state = storageData[STORAGE_KEY]?.webTelemetry_adwallDetection_day;
            expect(state.params.count.value).toBe(2);
        });

        it('should allow events when tabId is missing', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig(),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            registeredWebEventHandler({ type: 'adwall' }, {});
            await new Promise((resolve) => setTimeout(resolve, 10));
            registeredWebEventHandler({ type: 'adwall' }, {});
            await new Promise((resolve) => setTimeout(resolve, 10));

            const state = storageData[STORAGE_KEY]?.webTelemetry_adwallDetection_day;
            expect(state.params.count.value).toBe(2);
        });
    });

    describe('stopCounting', () => {
        it('should stop counting when max bucket is reached', async () => {
            const telemetry = {
                testPixel: makeTelemetryConfig({
                    buckets: {
                        0: { gte: 0, lt: 1 },
                        '1-2': { gte: 1, lt: 3 },
                        '3+': { gte: 3 },
                    },
                }),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            // Fire 5 events from different tabs to bypass dedup
            for (let i = 0; i < 5; i++) {
                registeredWebEventHandler({ type: 'adwall' }, { tab: { id: i + 1 } });
                await new Promise((resolve) => setTimeout(resolve, 10));
            }

            const state = storageData[STORAGE_KEY]?.testPixel;
            expect(state.params.count.stopCounting).toBe(true);
            expect(state.params.count.value).toBe(3);
        });
    });

    describe('pixel firing', () => {
        it('should fire pixel when alarm triggers', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig({ period: { seconds: 1 } }),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            // Add some events
            for (let i = 0; i < 5; i++) {
                registeredWebEventHandler({ type: 'adwall' }, { tab: { id: i + 1 } });
                await new Promise((resolve) => setTimeout(resolve, 10));
            }

            // Trigger the alarm
            for (const cb of onAlarmCallbacks) {
                await cb({ name: 'eventHub_fire_webTelemetry_adwallDetection_day' });
            }
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(firedPixels.length).toBe(1);
            expect(firedPixels[0].name).toBe('webTelemetry_adwallDetection_day');
            expect(firedPixels[0].params.count).toBe('3-5');
            expect(firedPixels[0].params.attributionPeriod).toBeDefined();
        });

        it('should not fire pixel when no events have been recorded (bucket 0)', async () => {
            const telemetry = {
                testPixel: makeTelemetryConfig({
                    period: { seconds: 1 },
                    buckets: {
                        '1-2': { gte: 1, lt: 3 },
                        '3+': { gte: 3 },
                    },
                }),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            for (const cb of onAlarmCallbacks) {
                await cb({ name: 'eventHub_fire_testPixel' });
            }
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(firedPixels.length).toBe(0);
        });

        it('should fire pixel with 0 bucket when configured', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig({ period: { seconds: 1 } }),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            for (const cb of onAlarmCallbacks) {
                await cb({ name: 'eventHub_fire_webTelemetry_adwallDetection_day' });
            }
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(firedPixels.length).toBe(1);
            expect(firedPixels[0].params.count).toBe('0');
        });

        it('should start a new period after firing', async () => {
            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig({ period: { seconds: 1 } }),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            for (const cb of onAlarmCallbacks) {
                await cb({ name: 'eventHub_fire_webTelemetry_adwallDetection_day' });
            }
            await new Promise((resolve) => setTimeout(resolve, 10));

            const state = storageData[STORAGE_KEY]?.webTelemetry_adwallDetection_day;
            expect(state).toBeDefined();
            expect(state.params.count.value).toBe(0);
        });
    });

    describe('persistence and restore', () => {
        it('should restore state and re-arm alarms on startup', async () => {
            const futureTime = Date.now() + 60000;
            storageData[STORAGE_KEY] = {
                webTelemetry_adwallDetection_day: {
                    pixelName: 'webTelemetry_adwallDetection_day',
                    periodStartMillis: Date.now() - 30000,
                    periodEndMillis: futureTime,
                    params: { count: { value: 3, stopCounting: false } },
                    config: makeTelemetryConfig(),
                },
            };

            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig(),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            expect(alarmListeners.eventHub_fire_webTelemetry_adwallDetection_day).toBeDefined();
            expect(alarmListeners.eventHub_fire_webTelemetry_adwallDetection_day.when).toBe(futureTime);
        });

        it('should fire immediately if period has elapsed during restart', async () => {
            const pastTime = Date.now() - 1000;
            storageData[STORAGE_KEY] = {
                webTelemetry_adwallDetection_day: {
                    pixelName: 'webTelemetry_adwallDetection_day',
                    periodStartMillis: pastTime - 86400000,
                    periodEndMillis: pastTime,
                    params: { count: { value: 5, stopCounting: false } },
                    config: makeTelemetryConfig(),
                },
            };

            const telemetry = {
                webTelemetry_adwallDetection_day: makeTelemetryConfig(),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            expect(firedPixels.length).toBe(1);
            expect(firedPixels[0].params.count).toBe('3-5');
        });
    });

    describe('disabled telemetry entries', () => {
        it('should not register disabled telemetry', async () => {
            const telemetry = {
                webTelemetry_disabled: makeTelemetryConfig({ state: 'disabled' }),
            };
            const remoteConfig = makeRemoteConfig({ enabled: true, telemetry });
            createEventHub(remoteConfig);
            await eventHub.ready;

            expect(Object.keys(alarmListeners).length).toBe(0);
        });
    });
});
