import {
    ALLOWLIST_CHANGED_SUBSCRIPTION,
    ALLOWLIST_SETTING,
    ALLOWLIST_VERSION_SETTING,
    UserAllowlistSync,
} from '../../shared/js/background/components/user-allowlist-sync';
import settings from '../../shared/js/background/settings';
import { isSafeListed } from '../../shared/js/background/utils';

function createMockNativeMessaging() {
    /** @type {Map<string, (params: any) => void>} */
    const subscriptions = new Map();
    return {
        notify: jasmine.createSpy('notify').and.returnValue(Promise.resolve()),
        request: jasmine.createSpy('request').and.returnValue(Promise.resolve({ updated: false })),
        subscribe: jasmine.createSpy('subscribe').and.callFake((name, callback) => {
            subscriptions.set(name, callback);
            return () => subscriptions.delete(name);
        }),
        emit: (name, params) => subscriptions.get(name)?.(params),
    };
}

/**
 * Settings held in memory, which only accept reads and writes once `ready` resolves, like the real ones.
 * @param {Record<string, any>} [initial]
 */
function createMockSettings(initial = {}) {
    const values = { ...initial };
    let isReady = false;
    let markReady;
    const ready = new Promise((resolve) => {
        markReady = resolve;
    }).then(() => {
        isReady = true;
    });
    return {
        values,
        load: () => markReady(),
        ready: () => ready,
        getSetting: (name) => (isReady ? values[name] : undefined),
        updateSetting: jasmine.createSpy('updateSetting').and.callFake((name, value) => {
            if (isReady) values[name] = value;
        }),
    };
}

describe('UserAllowlistSync', () => {
    let nativeMessaging;
    let settingsApi;

    function createSync() {
        return new UserAllowlistSync(nativeMessaging, { settingsApi });
    }

    beforeEach(() => {
        nativeMessaging = createMockNativeMessaging();
        settingsApi = createMockSettings();
    });

    it('subscribes synchronously in the constructor', () => {
        createSync();
        expect(nativeMessaging.subscribe).toHaveBeenCalledWith(ALLOWLIST_CHANGED_SUBSCRIPTION, jasmine.any(Function));
    });

    it('pulls the allowlist once settings load, and stores it in the allowlisted setting', async () => {
        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
        const sync = createSync();
        expect(nativeMessaging.request).not.toHaveBeenCalled();

        settingsApi.load();
        await sync.ready;

        expect(nativeMessaging.request).toHaveBeenCalledWith('getAllowlistIfNew', { version: null });
        expect(settingsApi.values[ALLOWLIST_SETTING]).toEqual({ 'example.com': true });
        expect(settingsApi.values[ALLOWLIST_VERSION_SETTING]).toBe('v1');
        expect(sync.domains).toEqual(['example.com']);
        expect(sync.version).toBe('v1');
    });

    it('sends the stored version after a background restart', async () => {
        settingsApi = createMockSettings({ [ALLOWLIST_SETTING]: { 'example.com': true }, [ALLOWLIST_VERSION_SETTING]: 'v1' });
        const sync = createSync();
        settingsApi.load();
        await sync.ready;

        expect(nativeMessaging.request).toHaveBeenCalledWith('getAllowlistIfNew', { version: 'v1' });
        expect(settingsApi.updateSetting).not.toHaveBeenCalled();
        expect(sync.domains).toEqual(['example.com']);
    });

    it('stores the list from a change event', async () => {
        const sync = createSync();
        settingsApi.load();
        await sync.ready;

        nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v2', domains: ['a.com', 'b.com'] });
        await settingsApi.ready();

        expect(settingsApi.values[ALLOWLIST_SETTING]).toEqual({ 'a.com': true, 'b.com': true });
        expect(sync.version).toBe('v2');
    });

    it('applies a change event that arrives before settings load', async () => {
        const sync = createSync();
        nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v2', domains: ['early.com'] });

        settingsApi.load();
        await sync.ready;

        expect(sync.domains).toEqual(['early.com']);
        expect(sync.version).toBe('v2');
    });

    it('ignores a change event for the version it already has, or a malformed one', async () => {
        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
        const sync = createSync();
        settingsApi.load();
        await sync.ready;
        settingsApi.updateSetting.calls.reset();

        nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v1', domains: ['example.com'] });
        nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v2' });
        await settingsApi.ready();

        expect(settingsApi.updateSetting).not.toHaveBeenCalled();
        expect(sync.version).toBe('v1');
    });

    it('discards a startup pull that a change event overtook', async () => {
        let resolvePull;
        nativeMessaging.request.and.returnValue(
            new Promise((resolve) => {
                resolvePull = resolve;
            }),
        );
        const sync = createSync();
        settingsApi.load();
        await settingsApi.ready();
        await new Promise((resolve) => setTimeout(resolve, 0));

        nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v2', domains: ['new.com'] });
        resolvePull({ updated: true, version: 'v1', domains: ['old.com'] });
        await sync.ready;

        expect(sync.domains).toEqual(['new.com']);
    });

    it('keeps the current list when native reports no change or the request fails', async () => {
        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
        const sync = createSync();
        settingsApi.load();
        await sync.ready;

        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: false }));
        await sync._pull();
        spyOn(console, 'error');
        nativeMessaging.request.and.returnValue(Promise.reject(new Error('no native')));
        await sync._pull();

        expect(sync.version).toBe('v1');
        expect(sync.domains).toEqual(['example.com']);
    });

    it('logs, rather than rejecting, when storing a change event fails', async () => {
        const sync = createSync();
        settingsApi.load();
        await sync.ready;
        const errorLogged = new Promise((resolve) => spyOn(console, 'error').and.callFake(resolve));
        settingsApi.updateSetting.and.throwError(new Error('storage failed'));

        nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v1', domains: ['example.com'] });

        await errorLogged;
        expect(console.error).toHaveBeenCalledWith('UserAllowlistSync: failed to store allowlist', jasmine.any(Error));
    });

    describe('with the extension settings', () => {
        afterEach(() => {
            settings.removeSetting(ALLOWLIST_SETTING);
            settings.removeSetting(ALLOWLIST_VERSION_SETTING);
        });

        it('makes utils.isSafeListed follow the native allowlist', async () => {
            await settings.ready();
            nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
            const sync = new UserAllowlistSync(nativeMessaging);
            await sync.ready;

            expect(isSafeListed('https://example.com/')).toBeTrue();
            expect(isSafeListed('https://sub.example.com/page')).toBeTrue();
            expect(isSafeListed('https://other.com/')).toBeFalse();

            nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v2', domains: ['other.com'] });
            await settings.ready();

            expect(isSafeListed('https://example.com/')).toBeFalse();
            expect(isSafeListed('https://other.com/')).toBeTrue();
        });
    });
});
