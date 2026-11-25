import NativeMessaging, { NATIVE_EVENT_COMMAND, NativeMessagingTransport } from '../../shared/js/background/components/native-messaging';

function createMockCommands() {
    /** @type {((command: string) => void)[]} */
    const listeners = [];
    return {
        onCommand: { addListener: (listener) => listeners.push(listener) },
        fire: (command) => listeners.forEach((listener) => listener(command)),
        listeners,
    };
}

const event = (featureName, subscriptionName, params) => ({ featureName, subscriptionName, params });
const eventsResponse = (...events) => Promise.resolve({ result: { events } });

describe('NativeMessagingTransport', () => {
    let commands;
    let sendNativeMessage;

    function createTransport() {
        return new NativeMessagingTransport({ appId: 'app', commands, sendNativeMessage });
    }

    beforeEach(() => {
        NativeMessagingTransport.resetSharedForTesting();
        commands = createMockCommands();
        sendNativeMessage = jasmine.createSpy('sendNativeMessage').and.callFake(() => eventsResponse());
    });

    afterEach(() => {
        NativeMessagingTransport.resetSharedForTesting();
    });

    it('is a singleton', async () => {
        const transport = createTransport();
        expect(NativeMessagingTransport.shared()).toBe(transport);
        expect(() => createTransport()).toThrowError(/already exists/);
        await transport.ready;
    });

    it('registers its command listener synchronously in the constructor', async () => {
        const transport = createTransport();
        expect(commands.listeners.length).toBe(1);
        await transport.ready;
    });

    it('drains once at start, after the current turn has subscribed', async () => {
        sendNativeMessage.and.callFake(() => eventsResponse(event('feature', 'changed', { n: 1 })));
        const transport = createTransport();
        const callback = jasmine.createSpy('callback');
        new NativeMessaging('ctx', 'feature', { transport }).subscribe('changed', callback);
        await transport.ready;

        expect(sendNativeMessage).toHaveBeenCalledOnceWith(
            'app',
            jasmine.objectContaining({ featureName: 'nativeEvents', method: 'drainEvents' }),
        );
        expect(callback).toHaveBeenCalledOnceWith({ n: 1 });
    });

    it('drains when native performs the event command, and ignores other commands', async () => {
        const transport = createTransport();
        await transport.ready;
        sendNativeMessage.calls.reset();

        commands.fire('some-other-command');
        expect(sendNativeMessage).not.toHaveBeenCalled();

        commands.fire(NATIVE_EVENT_COMMAND);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(sendNativeMessage).toHaveBeenCalledTimes(1);
    });

    it('routes events by feature and subscription name', async () => {
        const transport = createTransport();
        await transport.ready;
        const a = jasmine.createSpy('a');
        const b = jasmine.createSpy('b');
        new NativeMessaging('ctx', 'featureA', { transport }).subscribe('changed', a);
        new NativeMessaging('ctx', 'featureB', { transport }).subscribe('changed', b);

        sendNativeMessage.and.callFake(() => eventsResponse(event('featureB', 'changed', { x: 1 }), event('featureC', 'changed')));
        await transport.drain();

        expect(a).not.toHaveBeenCalled();
        expect(b).toHaveBeenCalledOnceWith({ x: 1 });
    });

    it('stops calling a listener after it unsubscribes', async () => {
        const transport = createTransport();
        await transport.ready;
        const callback = jasmine.createSpy('callback');
        const unsubscribe = new NativeMessaging('ctx', 'feature', { transport }).subscribe('changed', callback);
        unsubscribe();

        sendNativeMessage.and.callFake(() => eventsResponse(event('feature', 'changed')));
        await transport.drain();

        expect(callback).not.toHaveBeenCalled();
    });

    it('keeps dispatching when a listener throws or the pull fails', async () => {
        spyOn(console, 'error');
        const transport = createTransport();
        await transport.ready;
        const messaging = new NativeMessaging('ctx', 'feature', { transport });
        const callback = jasmine.createSpy('callback');
        messaging.subscribe('changed', () => {
            throw new Error('boom');
        });
        messaging.subscribe('changed', callback);

        sendNativeMessage.and.returnValue(Promise.reject(new Error('no native')));
        await transport.drain();
        sendNativeMessage.and.callFake(() => eventsResponse(event('feature', 'changed')));
        await transport.drain();

        expect(callback).toHaveBeenCalledOnceWith({});
    });

    it('drains once more when a command arrives during a pull', async () => {
        const transport = createTransport();
        await transport.ready;
        const callback = jasmine.createSpy('callback');
        new NativeMessaging('ctx', 'feature', { transport }).subscribe('changed', callback);

        let resolveFirst;
        sendNativeMessage.and.returnValues(
            new Promise((resolve) => {
                resolveFirst = resolve;
            }),
            eventsResponse(event('feature', 'changed', { n: 2 })),
        );
        const first = transport.drain();
        commands.fire(NATIVE_EVENT_COMMAND);
        resolveFirst({ result: { events: [event('feature', 'changed', { n: 1 })] } });
        await first;

        expect(callback.calls.allArgs()).toEqual([[{ n: 1 }], [{ n: 2 }]]);
    });
});

describe('NativeMessaging', () => {
    let transport;

    beforeEach(() => {
        transport = jasmine.createSpyObj('transport', {
            notify: Promise.resolve(),
            request: Promise.resolve({ ok: true }),
            subscribe: () => {},
        });
    });

    it('sends requests and notifications for its context and feature through the transport', async () => {
        const messaging = new NativeMessaging('ctx', 'myFeature', { transport });

        expect(await messaging.request('getThing', { a: 1 })).toEqual({ ok: true });
        await messaging.notify('didThing', { b: 2 });

        expect(transport.request).toHaveBeenCalledOnceWith(
            jasmine.objectContaining({
                context: 'ctx',
                featureName: 'myFeature',
                method: 'getThing',
                params: { a: 1 },
                id: jasmine.any(String),
            }),
        );
        expect(transport.notify).toHaveBeenCalledOnceWith({
            context: 'ctx',
            featureName: 'myFeature',
            method: 'didThing',
            params: { b: 2 },
        });
    });

    it('subscribes to its own context and feature', () => {
        const messaging = new NativeMessaging('ctx', 'myFeature', { transport });
        const callback = () => {};

        messaging.subscribe('changed', callback);

        expect(transport.subscribe).toHaveBeenCalledOnceWith(
            { context: 'ctx', featureName: 'myFeature', subscriptionName: 'changed' },
            callback,
        );
    });
});
