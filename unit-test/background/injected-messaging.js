import browser from 'webextension-polyfill';
import { InjectedMessaging } from '../../shared/js/background/components/injected-messaging';

describe('InjectedMessaging', () => {
    let messaging;
    let sendBridgeMessage;

    function connectPort(postMessage) {
        let onConnect;
        spyOn(browser.runtime.onConnect, 'addListener').and.callFake((listener) => {
            onConnect = listener;
        });
        messaging = new InjectedMessaging();
        const port = {
            name: 'injected',
            sender: { documentId: 'document' },
            postMessage,
            onMessage: { addListener: jasmine.createSpy('onMessage.addListener') },
            onDisconnect: { addListener() {} },
        };
        onConnect(port);
        return port;
    }

    beforeEach(() => {
        sendBridgeMessage = jasmine.createSpy('sendBridgeMessage');
        globalThis.chrome.ddg = { sendBridgeMessage };
    });

    afterEach(() => {
        delete globalThis.chrome.ddg;
    });

    it('answers a request with the browser result', async () => {
        sendBridgeMessage.and.resolveTo({ platform: 'windows' });
        const postMessage = jasmine.createSpy('postMessage');
        const port = connectPort(postMessage);

        await messaging.onMessage({ context: 'c', featureName: 'aiChat', method: 'm', id: '1' }, port);

        expect(postMessage).toHaveBeenCalledOnceWith({
            context: 'c',
            featureName: 'aiChat',
            id: '1',
            result: { platform: 'windows' },
        });
    });

    it('answers a rejected request with the error', async () => {
        sendBridgeMessage.and.rejectWith(new Error('rejected'));
        const postMessage = jasmine.createSpy('postMessage');
        const port = connectPort(postMessage);

        await messaging.onMessage({ context: 'c', featureName: 'aiChat', method: 'm', id: '1' }, port);

        expect(postMessage).toHaveBeenCalledOnceWith({
            context: 'c',
            featureName: 'aiChat',
            id: '1',
            error: { message: 'rejected' },
        });
    });

    it('drops an answer for a port that has closed, without rejecting', async () => {
        sendBridgeMessage.and.resolveTo({});
        const postMessage = jasmine.createSpy('postMessage').and.throwError('Attempting to use a disconnected port object');
        const port = connectPort(postMessage);

        await expectAsync(messaging.onMessage({ context: 'c', featureName: 'aiChat', method: 'm', id: '1' }, port)).toBeResolved();
    });
});
