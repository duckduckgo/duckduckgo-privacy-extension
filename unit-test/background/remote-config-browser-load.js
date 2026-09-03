import { loadConfigFromBrowser } from '../../shared/js/background/components/remote-config';

/**
 * Stand in for the `chrome.ddg` API that only DDG-branded Chromium exposes.
 * @param {(message: any) => Promise<any>} handler
 */
function installDdgApi(handler) {
    // @ts-expect-error - chrome.ddg is absent from the test shim by design
    chrome.ddg = { send: jasmine.createSpy('send').and.callFake(handler), onMessage: { addListener() {}, removeListener() {} } };
    // @ts-expect-error - see above
    return chrome.ddg.send;
}

function removeDdgApi() {
    // @ts-expect-error - see above
    delete chrome.ddg;
}

const browserConfig = { version: 1234, features: { autoconsent: { state: 'enabled' } } };

describe('loadConfigFromBrowser', () => {
    afterEach(removeDdgApi);

    it('asks the browser for its copy of the config', async () => {
        const send = installDdgApi(async () => ({ config: browserConfig, etag: 'abc' }));

        const result = await loadConfigFromBrowser('');

        expect(result).toEqual({ contents: browserConfig, etag: 'abc' });
        expect(send).toHaveBeenCalledWith({
            context: 'ddgInternalExtension',
            featureName: 'config',
            method: 'get',
            params: {},
        });
    });

    it('falls back to the config version when the browser sends no etag', async () => {
        installDdgApi(async () => ({ config: browserConfig }));

        expect(await loadConfigFromBrowser('')).toEqual({ contents: browserConfig, etag: 'version-1234' });
    });

    it('leaves the etag off when the copy has not changed, so it is not re-stored', async () => {
        installDdgApi(async () => ({ config: browserConfig, etag: 'abc' }));

        expect(await loadConfigFromBrowser('abc')).toEqual({ contents: browserConfig });
    });

    // The three ways there is nothing to use, all of which have to fall through
    // to downloading the config ourselves rather than leaving us with none.
    it('rejects when there is no browser to ask', async () => {
        removeDdgApi();

        await expectAsync(loadConfigFromBrowser('')).toBeRejected();
    });

    it('rejects when the browser is there but does not answer', async () => {
        installDdgApi(() => Promise.reject(new Error('browser is unhappy')));
        spyOn(console, 'error');

        await expectAsync(loadConfigFromBrowser('')).toBeRejected();
    });

    it('rejects when the browser echoes instead of routing', async () => {
        // What `ddg.send()` does today, before anything browser-side handles
        // this method.
        installDdgApi(async (message) => ({ received: message, browserVersion: '148.0.0.0' }));

        await expectAsync(loadConfigFromBrowser('')).toBeRejected();
    });
});
