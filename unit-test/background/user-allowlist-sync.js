import {
    ALLOWLIST_CHANGED_COMMAND,
    ALLOWLIST_STORAGE_KEY,
    UserAllowlistSync,
} from '../../shared/js/background/components/user-allowlist-sync';
import { removeFromSessionStorage, setToSessionStorage } from '../../shared/js/background/wrapper';

function createMockNativeMessaging() {
    return {
        notify: jasmine.createSpy('notify').and.returnValue(Promise.resolve()),
        request: jasmine.createSpy('request').and.returnValue(Promise.resolve({ updated: false })),
        subscribe: jasmine.createSpy('subscribe'),
    };
}

function createMockCommands() {
    /** @type {((command: string) => void)[]} */
    const listeners = [];
    return {
        onCommand: { addListener: (listener) => listeners.push(listener) },
        fire: (command) => listeners.forEach((listener) => listener(command)),
        listeners,
    };
}

describe('UserAllowlistSync', () => {
    let nativeMessaging;
    let commands;

    beforeEach(async () => {
        await removeFromSessionStorage(ALLOWLIST_STORAGE_KEY);
        nativeMessaging = createMockNativeMessaging();
        commands = createMockCommands();
    });

    it('registers its command listener synchronously in the constructor', () => {
        // eslint-disable-next-line no-new
        new UserAllowlistSync(nativeMessaging, { commands });
        expect(commands.listeners.length).toBe(1);
    });

    it('pulls the allowlist on start with no known version', async () => {
        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
        const sync = new UserAllowlistSync(nativeMessaging, { commands });
        await sync.ready;

        expect(nativeMessaging.request).toHaveBeenCalledWith('getAllowlistIfNew', { version: null });
        expect(sync.version).toBe('v1');
        expect(sync.isAllowlisted('example.com')).toBeTrue();
        expect(sync.isAllowlisted('EXAMPLE.com')).toBeTrue();
        expect(sync.isAllowlisted('sub.example.com')).toBeFalse();
    });

    it('restores the stored state after a background restart and sends its version', async () => {
        await setToSessionStorage(ALLOWLIST_STORAGE_KEY, { version: 'v1', domains: ['example.com'] });
        const sync = new UserAllowlistSync(nativeMessaging, { commands });
        await sync.ready;

        expect(nativeMessaging.request).toHaveBeenCalledWith('getAllowlistIfNew', { version: 'v1' });
        expect(sync.isAllowlisted('example.com')).toBeTrue();
    });

    it('syncs again when native performs the allowlist-changed command', async () => {
        const sync = new UserAllowlistSync(nativeMessaging, { commands });
        await sync.ready;
        const onChange = jasmine.createSpy('onChange');
        sync.onChange(onChange);

        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v2', domains: ['a.com', 'b.com'] }));
        commands.fire(ALLOWLIST_CHANGED_COMMAND);
        await sync.sync();

        expect(sync.domains).toEqual(['a.com', 'b.com']);
        expect(onChange).toHaveBeenCalledWith({ version: 'v2', domains: ['a.com', 'b.com'] });
    });

    it('ignores other commands', async () => {
        const sync = new UserAllowlistSync(nativeMessaging, { commands });
        await sync.ready;
        nativeMessaging.request.calls.reset();

        commands.fire('some-other-command');

        expect(nativeMessaging.request).not.toHaveBeenCalled();
    });

    it('keeps the current list when native reports no change', async () => {
        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
        const sync = new UserAllowlistSync(nativeMessaging, { commands });
        await sync.ready;

        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: false }));
        await sync.sync();

        expect(sync.version).toBe('v1');
        expect(sync.isAllowlisted('example.com')).toBeTrue();
    });

    it('keeps the current list when the native request fails', async () => {
        nativeMessaging.request.and.returnValue(Promise.resolve({ updated: true, version: 'v1', domains: ['example.com'] }));
        const sync = new UserAllowlistSync(nativeMessaging, { commands });
        await sync.ready;

        spyOn(console, 'error');
        nativeMessaging.request.and.returnValue(Promise.reject(new Error('no native')));
        await sync.sync();

        expect(sync.isAllowlisted('example.com')).toBeTrue();
    });

    it('runs one more sync when a change is signalled during a request', async () => {
        const sync = new UserAllowlistSync(nativeMessaging, { commands });
        await sync.ready;

        let resolveFirst;
        nativeMessaging.request.and.returnValues(
            new Promise((resolve) => {
                resolveFirst = resolve;
            }),
            Promise.resolve({ updated: true, version: 'v3', domains: ['late.com'] }),
        );
        const first = sync.sync();
        const second = sync.sync();
        expect(second).toBe(first);
        resolveFirst({ updated: true, version: 'v2', domains: ['early.com'] });
        await first;

        expect(nativeMessaging.request.calls.count()).toBe(3);
        expect(nativeMessaging.request.calls.mostRecent().args).toEqual(['getAllowlistIfNew', { version: 'v2' }]);
        expect(sync.domains).toEqual(['late.com']);
    });
});
