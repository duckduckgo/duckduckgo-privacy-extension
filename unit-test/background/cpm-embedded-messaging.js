import {
    CPMEmbeddedMessaging,
    MAX_CACHE_SIZE,
    SUBFEATURE_CHECK_TTL,
    SETTING_CHECK_TTL,
    SITE_CHECK_TTL,
    NATIVE_MESSAGE_TIMEOUT_MS,
} from '../../shared/js/background/components/cpm-embedded-messaging';
import { sessionStorageFallback } from '../../shared/js/background/wrapper';

/**
 * Create a mock NativeMessagingInterface with spies.
 */
function createMockNativeMessaging() {
    return {
        notify: jasmine.createSpy('notify').and.returnValue(Promise.resolve()),
        request: jasmine.createSpy('request').and.returnValue(Promise.resolve({})),
        subscribe: jasmine.createSpy('subscribe'),
    };
}

describe('CPMEmbeddedMessaging', () => {
    let nativeMessaging;
    let messaging;

    beforeEach(() => {
        nativeMessaging = createMockNativeMessaging();
        messaging = new CPMEmbeddedMessaging(nativeMessaging);
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date('2026-01-01T00:00:00Z'));
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    describe('_notify', () => {
        it('sends a notification via nativeMessaging', async () => {
            await messaging._notify('testMethod', { key: 'value' });
            expect(nativeMessaging.notify).toHaveBeenCalledWith('testMethod', { key: 'value' });
        });

        it('records native notification failures for diagnostics', async () => {
            const diagnosticsHandler = jasmine.createSpy('diagnosticsHandler');
            messaging.setDiagnosticsErrorHandler(diagnosticsHandler);
            nativeMessaging.notify.and.returnValue(Promise.reject(new Error('test error')));
            spyOn(console, 'error');

            await messaging._notify('testMethod', { tabId: 7 });

            expect(diagnosticsHandler).toHaveBeenCalledWith(7, 'tab_testMethod');
        });

        it('records global native notification failures for diagnostics', async () => {
            const diagnosticsHandler = jasmine.createSpy('diagnosticsHandler');
            messaging.setDiagnosticsErrorHandler(diagnosticsHandler);
            nativeMessaging.notify.and.returnValue(Promise.reject(new Error('test error')));
            spyOn(console, 'error');

            await messaging._notify('testMethod', {});
            expect(diagnosticsHandler).toHaveBeenCalledWith(null, 'glob_testMethod');
        });

        it('sends notifications in parallel', async () => {
            let resolveFirst;
            const firstNativeNotification = new Promise((resolve) => {
                resolveFirst = resolve;
            });
            nativeMessaging.notify.and.callFake((method) => {
                return method === 'first' ? firstNativeNotification : Promise.resolve();
            });

            let firstResolved = false;
            const first = messaging._notify('first', {}).then(() => {
                firstResolved = true;
            });
            await messaging._notify('second', {});

            expect(nativeMessaging.notify.calls.allArgs()).toEqual([
                ['first', {}],
                ['second', {}],
            ]);
            expect(firstResolved).toBeFalse();

            resolveFirst();
            await first;
        });

        it('sends other notifications when one fails', async () => {
            nativeMessaging.notify.and.callFake(async (method) => {
                if (method === 'fail') {
                    throw new Error('test error');
                }
            });
            spyOn(console, 'error');

            await Promise.all([messaging._notify('fail', {}), messaging._notify('after', {})]);

            expect(nativeMessaging.notify).toHaveBeenCalledTimes(2);
            expect(nativeMessaging.notify).toHaveBeenCalledWith('after', {});
            expect(console.error).toHaveBeenCalled();
        });

        it('times out a hung notification and records diagnostics', async () => {
            const diagnosticsHandler = jasmine.createSpy('diagnosticsHandler');
            messaging.setDiagnosticsErrorHandler(diagnosticsHandler);
            nativeMessaging.notify.and.returnValue(new Promise(() => {}));
            spyOn(console, 'error');

            const notification = messaging._notify('testMethod', { tabId: 7 });
            jasmine.clock().tick(NATIVE_MESSAGE_TIMEOUT_MS);

            await expectAsync(notification).toBeResolvedTo(undefined);
            expect(diagnosticsHandler).toHaveBeenCalledWith(7, 'tab_testMethod');
        });
    });

    describe('_request', () => {
        it('sends a request via nativeMessaging and returns the result', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve({ data: 42 }));
            const result = await messaging._request('testMethod', { key: 'value' });
            expect(nativeMessaging.request).toHaveBeenCalledWith('testMethod', { key: 'value' });
            expect(result).toEqual({ data: 42 });
        });

        it('records native request failures for diagnostics', async () => {
            const diagnosticsHandler = jasmine.createSpy('diagnosticsHandler');
            messaging.setDiagnosticsErrorHandler(diagnosticsHandler);
            nativeMessaging.request.and.returnValue(Promise.reject(new Error('test error')));
            spyOn(console, 'error');

            await messaging._request('testMethod', {}, undefined, undefined, 8);

            expect(diagnosticsHandler).toHaveBeenCalledWith(8, 'tab_testMethod');
        });

        it('records global native request failures for diagnostics', async () => {
            const diagnosticsHandler = jasmine.createSpy('diagnosticsHandler');
            messaging.setDiagnosticsErrorHandler(diagnosticsHandler);
            nativeMessaging.request.and.returnValue(Promise.reject(new Error('test error')));
            spyOn(console, 'error');

            await messaging._request('testMethod', {});

            expect(diagnosticsHandler).toHaveBeenCalledWith(null, 'glob_testMethod');
        });

        it('sends requests in parallel', async () => {
            let resolveFirst;
            const firstNativeRequest = new Promise((resolve) => {
                resolveFirst = resolve;
            });
            nativeMessaging.request.and.callFake((method) => {
                return method === 'first' ? firstNativeRequest : Promise.resolve({ method });
            });

            let firstResolved = false;
            const first = messaging._request('first', {}).then(() => {
                firstResolved = true;
            });
            const secondResult = await messaging._request('second', {});

            expect(nativeMessaging.request.calls.allArgs()).toEqual([
                ['first', {}],
                ['second', {}],
            ]);
            expect(secondResult).toEqual({ method: 'second' });
            expect(firstResolved).toBeFalse();

            resolveFirst({ method: 'first' });
            await first;
        });

        it('keeps concurrent cache misses for the same key parallel', async () => {
            const resolvers = [];
            nativeMessaging.request.and.callFake(
                () =>
                    new Promise((resolve) => {
                        resolvers.push(resolve);
                    }),
            );

            const first = messaging._request('test', {}, 'sharedKey', 5000);
            const second = messaging._request('test', {}, 'sharedKey', 5000);

            expect(nativeMessaging.request).toHaveBeenCalledTimes(2);
            resolvers.forEach((resolve) => resolve({ enabled: true }));
            await expectAsync(Promise.all([first, second])).toBeResolvedTo([{ enabled: true }, { enabled: true }]);
        });

        it('times out a request, records diagnostics, and ignores its late result', async () => {
            const diagnosticsHandler = jasmine.createSpy('diagnosticsHandler');
            messaging.setDiagnosticsErrorHandler(diagnosticsHandler);
            spyOn(console, 'error');
            let resolveTimedOutRequest;
            nativeMessaging.request.and.returnValue(
                new Promise((resolve) => {
                    resolveTimedOutRequest = resolve;
                }),
            );

            const request = messaging._request('test', {}, 'sharedKey', 5000, 1);
            jasmine.clock().tick(NATIVE_MESSAGE_TIMEOUT_MS);

            await expectAsync(request).toBeResolvedTo(undefined);
            expect(diagnosticsHandler).toHaveBeenCalledWith(1, 'tab_test');
            expect(messaging._cache.has('sharedKey')).toBeFalse();

            resolveTimedOutRequest({ value: 'stale' });
            await Promise.resolve();
            expect(messaging._cache.has('sharedKey')).toBeFalse();
        });

        it('honors a custom timeout', async () => {
            const diagnosticsHandler = jasmine.createSpy('diagnosticsHandler');
            messaging.setDiagnosticsErrorHandler(diagnosticsHandler);
            spyOn(console, 'error');
            nativeMessaging.request.and.returnValue(new Promise(() => {}));

            const customTimeout = 5000;
            const request = messaging._request('test', {}, undefined, undefined, 1, customTimeout);

            // Not timed out yet just before the custom timeout elapses.
            jasmine.clock().tick(customTimeout - 1);
            await Promise.resolve();
            expect(diagnosticsHandler).not.toHaveBeenCalled();

            jasmine.clock().tick(1);
            await expectAsync(request).toBeResolvedTo(undefined);
            expect(diagnosticsHandler).toHaveBeenCalledWith(1, 'tab_test');
        });

        it('caches results when cacheKey and ttl are provided', async () => {
            expect(messaging._cache.size).toBe(0);
            nativeMessaging.request.and.returnValue(Promise.resolve({ enabled: true }));

            const result1 = await messaging._request('test', {}, 'myKey', 5000);
            expect(result1).toEqual({ enabled: true });
            expect(nativeMessaging.request).toHaveBeenCalledTimes(1);

            // Second call within TTL should return cached value
            const result2 = await messaging._request('test', {}, 'myKey', 5000);
            expect(result2).toEqual({ enabled: true });
            expect(nativeMessaging.request).toHaveBeenCalledTimes(1);
            expect(messaging._cache.size).toBe(1);
            expect(messaging._cache.get('myKey')).toBeDefined();
        });

        it('refreshes cache after TTL expires', async () => {
            expect(messaging._cache.size).toBe(0);
            nativeMessaging.request.and.returnValues(Promise.resolve({ value: 'old' }), Promise.resolve({ value: 'new' }));

            const result1 = await messaging._request('test', {}, 'myKey', 5000);
            expect(result1).toEqual({ value: 'old' });

            // Advance time past TTL
            jasmine.clock().tick(5001);

            const result2 = await messaging._request('test', {}, 'myKey', 5000);
            expect(result2).toEqual({ value: 'new' });
            expect(nativeMessaging.request).toHaveBeenCalledTimes(2);
            expect(messaging._cache.size).toBe(1);
            expect(messaging._cache.get('myKey')).toBeDefined();
        });

        it('does not cache when cacheKey is not provided', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve({ data: 1 }));

            await messaging._request('test', {});
            await messaging._request('test', {});

            expect(nativeMessaging.request).toHaveBeenCalledTimes(2);
            expect(messaging._cache.size).toBe(0);
        });

        it('evicts the oldest cache entry when cache is full', async () => {
            let callCount = 0;
            nativeMessaging.request.and.callFake(async () => {
                return { value: callCount++ };
            });
            expect(messaging._cache.size).toBe(0);

            // Fill the cache to MAX_CACHE_SIZE
            for (let i = 0; i < MAX_CACHE_SIZE; i++) {
                await messaging._request('test', {}, `key${i}`, 60000);
                expect(nativeMessaging.request).toHaveBeenCalledTimes(i + 1);
                expect(messaging._cache.size).toBe(i + 1);
            }
            expect(nativeMessaging.request).toHaveBeenCalledTimes(MAX_CACHE_SIZE);
            expect(messaging._cache.size).toBe(MAX_CACHE_SIZE);

            // Add one more entry, which should evict the oldest (key0)
            await messaging._request('test', {}, `key${MAX_CACHE_SIZE}`, 60000);
            expect(nativeMessaging.request).toHaveBeenCalledTimes(MAX_CACHE_SIZE + 1);
            expect(messaging._cache.size).toBe(MAX_CACHE_SIZE);

            // key1 should still be cached
            await messaging._request('test', {}, 'key1', 60000);
            expect(nativeMessaging.request).toHaveBeenCalledTimes(MAX_CACHE_SIZE + 1);
            expect(messaging._cache.size).toBe(MAX_CACHE_SIZE);

            // key0 should have been evicted, so requesting it should make a new call
            await messaging._request('test', {}, 'key0', 60000);
            expect(nativeMessaging.request).toHaveBeenCalledTimes(MAX_CACHE_SIZE + 2);
            expect(messaging._cache.size).toBe(MAX_CACHE_SIZE);
        });

        it('completes other requests when one fails', async () => {
            nativeMessaging.request.and.callFake(async (method) => {
                if (method === 'fail') {
                    throw new Error('test error');
                }
                return { ok: true };
            });
            spyOn(console, 'error');

            const [, result] = await Promise.all([messaging._request('fail', {}), messaging._request('succeed', {})]);

            expect(nativeMessaging.request).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ ok: true });
            expect(console.error).toHaveBeenCalled();
        });

        it('the resulting promise resolves only after the request is complete', async () => {
            let underlyingResolve;
            const underlyingPromise = new Promise((resolve) => {
                underlyingResolve = resolve;
            });
            nativeMessaging.request.and.returnValue(underlyingPromise);

            let resolved = false;
            const p = messaging._request('test', {});
            p.then(() => {
                resolved = true;
            });

            // flush microtasks — promise should still be pending
            await Promise.resolve();
            expect(resolved).toBeFalse();

            // now let the underlying request complete
            underlyingResolve({ ok: true });
            const result = await p;
            expect(result).toEqual({ ok: true });
            expect(resolved).toBeTrue();
        });
    });

    describe('logMessage', () => {
        it('sends a notification', async () => {
            await messaging.logMessage('hello world', true);
            expect(nativeMessaging.notify).toHaveBeenCalledWith('extensionLog', { message: 'hello world' });
        });
    });

    describe('refreshDashboardState', () => {
        it('sends a notification with the correct parameters', async () => {
            await messaging.refreshDashboardState(1, 'https://example.com', { cosmetic: true });

            expect(nativeMessaging.notify).toHaveBeenCalledWith('refreshCpmDashboardState', {
                tabId: 1,
                url: 'https://example.com',
                consentStatus: { cosmetic: true },
            });
        });

        it('sends dashboard updates in parallel without waiting for the previous one', async () => {
            let resolveFirst;
            nativeMessaging.notify.and.callFake((_method, params) => {
                if (params.consentStatus.cpmStage === 'init_received') {
                    return new Promise((resolve) => {
                        resolveFirst = resolve;
                    });
                }
                return Promise.resolve();
            });

            const first = messaging.refreshDashboardState(1, 'https://example.com', { cpmStage: 'init_received' });
            // The second update is sent even though the first is still in flight (no serialization).
            await messaging.refreshDashboardState(1, 'https://example.com', { cpmStage: 'done' });

            expect(nativeMessaging.notify.calls.allArgs().map(([, params]) => params.consentStatus.cpmStage)).toEqual([
                'init_received',
                'done',
            ]);

            resolveFirst();
            await first;
        });

        it('serializes cpmErrors before sending to native', async () => {
            await messaging.refreshDashboardState(1, 'https://example.com', {
                cpmErrors: ['tab_isFeatureEnabled', 'multiple_cmps'],
            });

            expect(nativeMessaging.notify).toHaveBeenCalledWith('refreshCpmDashboardState', {
                tabId: 1,
                url: 'https://example.com',
                consentStatus: {
                    cpmErrors: 'tab_isFeatureEnabled,multiple_cmps',
                },
            });
        });
    });

    describe('showCpmAnimation', () => {
        it('sends a notification with the correct parameters', async () => {
            await messaging.showCpmAnimation(5, 'https://example.com', true);

            expect(nativeMessaging.notify).toHaveBeenCalledWith('showCpmAnimation', {
                tabId: 5,
                topUrl: 'https://example.com',
                isCosmetic: true,
            });
        });
    });

    describe('notifyPopupHandled', () => {
        it('sends a notification with the correct parameters', async () => {
            const msg = { type: 'optOut' };
            await messaging.notifyPopupHandled(3, msg);

            expect(nativeMessaging.notify).toHaveBeenCalledWith('cookiePopupHandled', {
                tabId: 3,
                msg,
            });
        });
    });

    describe('checkAutoconsentSetting', () => {
        it('returns the native response when autoconsent is enabled', async () => {
            const settings = {
                enabled: true,
                userPreference: 'default',
                featureFlags: { heuristicAction: true },
            };
            nativeMessaging.request.and.returnValue(Promise.resolve(settings));
            const result = await messaging.checkAutoconsentSetting();
            expect(result).toEqual(settings);
            expect(nativeMessaging.request).toHaveBeenCalledWith('isAutoconsentSettingEnabled', {});
        });

        it('returns the native response when autoconsent is disabled', async () => {
            const settings = { enabled: false, featureFlags: {} };
            nativeMessaging.request.and.returnValue(Promise.resolve(settings));
            const result = await messaging.checkAutoconsentSetting();
            expect(result).toEqual(settings);
        });

        it('returns { enabled: false } when native response is null/undefined', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve(undefined));
            const result = await messaging.checkAutoconsentSetting();
            expect(result).toEqual({ enabled: false });
        });

        it('caches the result with SETTING_CHECK_TTL', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve({ enabled: true, featureFlags: {} }));

            await messaging.checkAutoconsentSetting();
            await messaging.checkAutoconsentSetting();
            expect(nativeMessaging.request).toHaveBeenCalledTimes(1);

            jasmine.clock().tick(SETTING_CHECK_TTL + 1);
            await messaging.checkAutoconsentSetting();
            expect(nativeMessaging.request).toHaveBeenCalledTimes(2);
        });
    });

    describe('checkAutoconsentEnabledForSite', () => {
        it('returns true when feature is enabled for the site', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve({ enabled: true }));
            const result = await messaging.checkAutoconsentEnabledForSite('https://example.com');
            expect(result).toBeTrue();
            expect(nativeMessaging.request).toHaveBeenCalledWith('isFeatureEnabled', {
                featureName: 'autoconsent',
                url: 'https://example.com',
            });
        });

        it('returns false when feature is disabled for the site', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve({ enabled: false }));
            const result = await messaging.checkAutoconsentEnabledForSite('https://example.com');
            expect(result).toBeFalse();
        });

        it('returns false when native response is null/undefined', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve(undefined));
            const result = await messaging.checkAutoconsentEnabledForSite('https://example.com');
            expect(result).toBeFalse();
        });

        it('caches per URL with SITE_CHECK_TTL', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve({ enabled: true }));

            await messaging.checkAutoconsentEnabledForSite('https://a.com');
            await messaging.checkAutoconsentEnabledForSite('https://a.com');
            expect(nativeMessaging.request).toHaveBeenCalledTimes(1);

            // Different URL should make a new request
            await messaging.checkAutoconsentEnabledForSite('https://b.com');
            expect(nativeMessaging.request).toHaveBeenCalledTimes(2);

            // After TTL expires, request is made again
            jasmine.clock().tick(SITE_CHECK_TTL + 1);
            await messaging.checkAutoconsentEnabledForSite('https://a.com');
            expect(nativeMessaging.request).toHaveBeenCalledTimes(3);
        });
    });

    describe('checkSubfeatureEnabled', () => {
        it('returns true when subfeature is enabled', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve({ enabled: true }));
            const result = await messaging.checkSubfeatureEnabled('heuristicAction');
            expect(result).toBeTrue();
            expect(nativeMessaging.request).toHaveBeenCalledWith('isSubFeatureEnabled', {
                featureName: 'autoconsent',
                subfeatureName: 'heuristicAction',
            });
        });

        it('returns false when subfeature is disabled', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve({ enabled: false }));
            const result = await messaging.checkSubfeatureEnabled('heuristicAction');
            expect(result).toBeFalse();
        });

        it('caches per subfeature name with SUBFEATURE_CHECK_TTL', async () => {
            nativeMessaging.request.and.returnValue(Promise.resolve({ enabled: true }));

            await messaging.checkSubfeatureEnabled('feat1');
            await messaging.checkSubfeatureEnabled('feat1');
            expect(nativeMessaging.request).toHaveBeenCalledTimes(1);

            // Different subfeature should make a new request
            await messaging.checkSubfeatureEnabled('feat2');
            expect(nativeMessaging.request).toHaveBeenCalledTimes(2);

            // After TTL expires, request is made again
            jasmine.clock().tick(SUBFEATURE_CHECK_TTL + 1);
            await messaging.checkSubfeatureEnabled('feat1');
            expect(nativeMessaging.request).toHaveBeenCalledTimes(3);
        });
    });

    describe('sendPixel', () => {
        it('sends a notification with the correct parameters', async () => {
            await messaging.sendPixel('somePixelName', 'daily', { foo: 'bar' });

            expect(nativeMessaging.notify).toHaveBeenCalledWith('sendPixel', {
                pixelName: 'somePixelName',
                type: 'daily',
                params: { foo: 'bar' },
            });
        });
    });

    describe('refreshRemoteConfig', () => {
        beforeEach(() => {
            sessionStorageFallback.clear();
        });

        it('returns new config when native side has an update', async () => {
            const cachedConfig = { version: '1', features: {} };
            const newConfig = { version: '2', features: { autoconsent: {} } };
            sessionStorageFallback.set('config', cachedConfig);
            nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, data: newConfig, version: '2' }));

            const result = await messaging.refreshRemoteConfig();

            expect(nativeMessaging.request).toHaveBeenCalledWith('getResourceIfNew', { name: 'config', version: '1' });
            expect(sessionStorageFallback.get('config')).toEqual(newConfig);
            expect(result).toEqual(newConfig);
        });

        it('returns cached config when native side has no update', async () => {
            const cachedConfig = { version: '1', features: {} };
            sessionStorageFallback.set('config', cachedConfig);
            nativeMessaging.request.and.returnValue(Promise.resolve({ updated: false }));

            const result = await messaging.refreshRemoteConfig();

            expect(sessionStorageFallback.get('config')).toEqual(cachedConfig);
            expect(result).toEqual(cachedConfig);
        });

        it('uses version "unknown" when no cached config exists', async () => {
            const newConfig = { version: '1', features: {} };
            nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, data: newConfig, version: '1' }));

            const result = await messaging.refreshRemoteConfig();

            expect(nativeMessaging.request).toHaveBeenCalledWith('getResourceIfNew', { name: 'config', version: 'unknown' });
            expect(result).toEqual(newConfig);
        });

        it('returns cached config on error if cache exists', async () => {
            const cachedConfig = { version: '1', features: {} };
            sessionStorageFallback.set('config', cachedConfig);
            nativeMessaging.request.and.returnValue(Promise.reject(new Error('network error')));

            const result = await messaging.refreshRemoteConfig();

            expect(result).toEqual(cachedConfig);
        });

        it('records config request failures for diagnostics', async () => {
            const diagnosticsHandler = jasmine.createSpy('diagnosticsHandler');
            const cachedConfig = { version: '1', features: {} };
            messaging.setDiagnosticsErrorHandler(diagnosticsHandler);
            sessionStorageFallback.set('config', cachedConfig);
            nativeMessaging.request.and.returnValue(Promise.reject(new Error('network error')));

            await messaging.refreshRemoteConfig();

            expect(diagnosticsHandler).toHaveBeenCalledWith(null, 'glob_getResourceIfNew');
        });

        it('throws on error if there is no cached config', async () => {
            const error = new Error('network error');
            nativeMessaging.request.and.returnValue(Promise.reject(error));

            await expectAsync(messaging.refreshRemoteConfig()).toBeRejectedWith(error);
        });
    });
});
