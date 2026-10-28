import { registeredContentScript } from '../../shared/js/background/message-handlers';

describe('registeredContentScript', () => {
    let previousComponents;

    beforeEach(() => {
        previousComponents = globalThis.components;
    });

    afterEach(() => {
        globalThis.components = previousComponents;
    });

    it('answers only once the config has loaded', async () => {
        let configLoaded;
        globalThis.components = { remoteConfig: { ready: new Promise((resolve) => (configLoaded = resolve)) } };
        let answered = false;

        const answer = registeredContentScript({}, { tab: { id: 1 }, frameId: 0 }, {}).then(() => {
            answered = true;
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(answered).toBeFalse();

        configLoaded();
        await answer;
        expect(answered).toBeTrue();
    });
});
