import { CPMChromiumEmbeddedMessaging } from '../../shared/js/background/components/cpm-chromium-embedded-messaging';
import { SETTING_CHECK_TTL } from '../../shared/js/background/components/cpm-embedded-messaging';

/**
 * Stand in for the `chrome.ddg` API that only DDG-branded Chromium exposes.
 * @param {(message: any) => Promise<any>} handler
 */
function installDdgApi(handler) {
    // @ts-expect-error - chrome.ddg is absent from the test shim by design
    chrome.ddg = { send: jasmine.createSpy('send').and.callFake(handler) };
    // @ts-expect-error - see above
    return chrome.ddg.send;
}

function removeDdgApi() {
    // @ts-expect-error - see above
    delete chrome.ddg;
}

describe('CPMChromiumEmbeddedMessaging', () => {
    let messaging;

    beforeEach(() => {
        messaging = new CPMChromiumEmbeddedMessaging({ remoteConfig: /** @type {any} */ ({}) });
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date('2026-01-01T00:00:00Z'));
    });

    afterEach(() => {
        jasmine.clock().uninstall();
        removeDdgApi();
    });

    describe('checkAutoconsentSetting', () => {
        it('falls back to the standalone defaults when there is no browser to ask', async () => {
            removeDdgApi();

            const settings = await messaging.checkAutoconsentSetting();

            expect(settings.enabled).toBeTrue();
            expect(settings.userPreference).toEqual('default');
            expect(settings.featureFlags.heuristicAction).toBeTrue();
        });

        it("returns the browser's setting when it answers", async () => {
            const send = installDdgApi(async () => ({
                enabled: true,
                userPreference: 'max',
                featureFlags: { heuristicAction: true },
            }));

            const settings = await messaging.checkAutoconsentSetting();

            expect(settings).toEqual({ enabled: true, userPreference: 'max', featureFlags: { heuristicAction: true } });
            expect(send).toHaveBeenCalledWith({
                context: 'ddgInternalExtension',
                featureName: 'autoconsent',
                method: 'getSettings',
                params: {},
            });
        });

        it('stays off when the browser is there but does not answer', async () => {
            installDdgApi(() => Promise.reject(new Error('browser is unhappy')));
            spyOn(console, 'error');

            const settings = await messaging.checkAutoconsentSetting();

            expect(settings.enabled).toBeFalse();
        });

        it('stays off on a malformed reply rather than defaulting on', async () => {
            installDdgApi(async () => ({ userPreference: 'max' }));

            const settings = await messaging.checkAutoconsentSetting();

            expect(settings.enabled).toBeFalse();
        });

        it('asks the browser once per TTL, then asks again', async () => {
            const send = installDdgApi(async () => ({ enabled: true, userPreference: 'default', featureFlags: {} }));

            await messaging.checkAutoconsentSetting();
            await messaging.checkAutoconsentSetting();
            expect(send).toHaveBeenCalledTimes(1);

            jasmine.clock().tick(SETTING_CHECK_TTL + 1);
            await messaging.checkAutoconsentSetting();
            expect(send).toHaveBeenCalledTimes(2);
        });

        it('caches a failure too, so a silent browser is not asked once per frame', async () => {
            const send = installDdgApi(() => Promise.reject(new Error('browser is unhappy')));
            spyOn(console, 'error');

            await messaging.checkAutoconsentSetting();
            await messaging.checkAutoconsentSetting();

            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe('notifyPopupHandled', () => {
        it('reports the handled popup to the browser', async () => {
            const send = installDdgApi(async () => ({}));

            await messaging.notifyPopupHandled(7, { cmp: 'SomeCMP', isCosmetic: true });

            expect(send).toHaveBeenCalledWith({
                context: 'ddgInternalExtension',
                featureName: 'autoconsent',
                method: 'cookiePopupHandled',
                params: { tabId: 7, cmp: 'SomeCMP', isCosmetic: true },
            });
        });

        it('does not throw when there is no browser to report to', async () => {
            removeDdgApi();

            await expectAsync(messaging.notifyPopupHandled(7, { cmp: 'SomeCMP', isCosmetic: false })).toBeResolved();
        });
    });
});
