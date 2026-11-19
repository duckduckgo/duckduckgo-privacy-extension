import {
    ALLOWLIST_CHANGED_SUBSCRIPTION,
    ALLOWLIST_STORAGE_KEY,
    UserAllowlistSync,
} from '../../shared/js/background/components/user-allowlist-sync';
import { getFromSessionStorage, removeFromSessionStorage, setToSessionStorage } from '../../shared/js/background/wrapper';

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

describe('UserAllowlistSync', () => {
    let nativeMessaging;

    beforeEach(async () => {
        await removeFromSessionStorage(ALLOWLIST_STORAGE_KEY);
        nativeMessaging = createMockNativeMessaging();
    });

    it('subscribes synchronously in the constructor', () => {
        // eslint-disable-next-line no-new
        new UserAllowlistSync(nativeMessaging);
        expect(nativeMessaging.subscribe).toHaveBeenCalledWith(ALLOWLIST_CHANGED_SUBSCRIPTION, jasmine.any(Function));
    });

    it('pulls the allowlist on start with no known version', async () => {
        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
        const sync = new UserAllowlistSync(nativeMessaging);
        await sync.ready;

        expect(nativeMessaging.request).toHaveBeenCalledWith('getAllowlistIfNew', { version: null });
        expect(sync.version).toBe('v1');
        expect(sync.isAllowlisted('example.com')).toBeTrue();
        expect(sync.isAllowlisted('EXAMPLE.com')).toBeTrue();
        expect(sync.isAllowlisted('sub.example.com')).toBeFalse();
    });

    it('restores the stored state after a background restart and sends its version', async () => {
        await setToSessionStorage(ALLOWLIST_STORAGE_KEY, { version: 'v1', domains: ['example.com'] });
        const sync = new UserAllowlistSync(nativeMessaging);
        await sync.ready;

        expect(nativeMessaging.request).toHaveBeenCalledWith('getAllowlistIfNew', { version: 'v1' });
        expect(sync.isAllowlisted('example.com')).toBeTrue();
    });

    it('applies and stores the list from a change event', async () => {
        const sync = new UserAllowlistSync(nativeMessaging);
        await sync.ready;
        const onChange = jasmine.createSpy('onChange');
        sync.onChange(onChange);

        nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v2', domains: ['a.com', 'b.com'] });
        await sync._persisting;

        expect(sync.domains).toEqual(['a.com', 'b.com']);
        expect(onChange).toHaveBeenCalledOnceWith({ version: 'v2', domains: ['a.com', 'b.com'] });
        expect(await getFromSessionStorage(ALLOWLIST_STORAGE_KEY)).toEqual({ version: 'v2', domains: ['a.com', 'b.com'] });
    });

    it('ignores a change event for the version it already has, or a malformed one', async () => {
        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
        const sync = new UserAllowlistSync(nativeMessaging);
        await sync.ready;
        const onChange = jasmine.createSpy('onChange');
        sync.onChange(onChange);

        nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v1', domains: ['example.com'] });
        nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v2' });

        expect(onChange).not.toHaveBeenCalled();
        expect(sync.version).toBe('v1');
    });

    it('discards a startup pull that a change event overtook', async () => {
        let resolvePull;
        nativeMessaging.request.and.returnValue(
            new Promise((resolve) => {
                resolvePull = resolve;
            }),
        );
        const sync = new UserAllowlistSync(nativeMessaging);
        await new Promise((resolve) => setTimeout(resolve, 0));

        nativeMessaging.emit(ALLOWLIST_CHANGED_SUBSCRIPTION, { version: 'v2', domains: ['new.com'] });
        resolvePull({ updated: true, version: 'v1', domains: ['old.com'] });
        await sync.ready;

        expect(sync.domains).toEqual(['new.com']);
    });

    it('keeps the current list when native reports no change', async () => {
        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
        const sync = new UserAllowlistSync(nativeMessaging);
        await sync.ready;

        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: false }));
        await sync._pull();

        expect(sync.version).toBe('v1');
        expect(sync.isAllowlisted('example.com')).toBeTrue();
    });

    it('keeps the current list when the native request fails', async () => {
        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
        const sync = new UserAllowlistSync(nativeMessaging);
        await sync.ready;

        spyOn(console, 'error');
        nativeMessaging.request.and.returnValue(Promise.reject(new Error('no native')));
        await sync._pull();

        expect(sync.isAllowlisted('example.com')).toBeTrue();
    });
});
