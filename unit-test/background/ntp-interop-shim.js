// The New Tab Page's shim (shared/js/ntp/interop-shim.js). It runs in the page, but is
// tested here beside ntp-messaging.js, the other end of its port.
describe('NTP interop shim', () => {
    /** @type {(msg: any) => void} */
    let receive;

    beforeAll(async () => {
        chrome.runtime.connect = /** @type {any} */ (
            () => ({
                onMessage: { addListener: (/** @type {any} */ listener) => (receive = listener) },
                onDisconnect: { addListener() {} },
                postMessage() {},
            })
        );
        // Connects as it loads.
        await import('../../shared/js/ntp/interop-shim.js');
    });

    const update = (subscriptionName, params) => ({ context: 'specialPages', featureName: 'newTabPage', subscriptionName, params });
    const tick = () => new Promise((resolve) => setTimeout(resolve));

    it('gives a listener added later the latest of each setting update, once the subscribing call returns', async () => {
        receive(update('customizer_onThemeUpdate', { theme: 'light' }));
        receive(update('customizer_onThemeUpdate', { theme: 'dark' }));
        receive(update('widgets_onConfigUpdated', [{ id: 'favorites', visibility: 'hidden' }]));
        receive(update('activity_onDataPatch', { urls: [] }));

        const received = [];
        globalThis.windowsInteropAddEventListener('message', ({ data }) => received.push(data));
        expect(received).toEqual([]);
        await tick();

        // Updates kept by the other specs, which run in random order, may come too.
        const names = received.map((msg) => msg.subscriptionName);
        expect(names).not.toContain('activity_onDataPatch');
        expect(names.filter((name) => name === 'customizer_onThemeUpdate').length).toBe(1);
        expect(received).toContain(update('customizer_onThemeUpdate', { theme: 'dark' }));
        expect(received).toContain(update('widgets_onConfigUpdated', [{ id: 'favorites', visibility: 'hidden' }]));
    });

    it('replays nothing to a listener removed before it could be given it', async () => {
        receive(update('omnibar_onConfigUpdate', { enableAi: false }));
        const handler = jasmine.createSpy('handler');
        globalThis.windowsInteropAddEventListener('message', handler);
        globalThis.windowsInteropRemoveEventListener('message', handler);
        await tick();

        expect(handler).not.toHaveBeenCalled();
    });
});
