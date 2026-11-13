import browser from 'webextension-polyfill';
import DebugTabs from '../../shared/js/background/components/debug-tabs';
import messageHandlers from '../../shared/js/background/message-registry';
import { removeFromSessionStorage } from '../../shared/js/background/wrapper';

const TAB_ID = 7;
const sender = { tab: { id: TAB_ID } };

/**
 * @param {string} action
 */
function send(action) {
    return messageHandlers.tabDebug({ action }, sender);
}

describe('DebugTabs', () => {
    /** @type {jasmine.Spy} */
    let reload;

    beforeEach(async () => {
        await removeFromSessionStorage('debugTabs');
        reload = spyOn(browser.tabs, 'reload').and.resolveTo();
    });

    describe('in a developer build', () => {
        /** @type {DebugTabs} */
        let debugTabs;

        beforeEach(async () => {
            debugTabs = new DebugTabs({ debugBuild: true });
            await debugTabs.ready;
        });

        it('reports the tab state without changing it', async () => {
            expect(await send('get')).toEqual({ available: true, enabled: false, devtools: false });
            expect(debugTabs.has(TAB_ID)).toBe(false);
            expect(reload).not.toHaveBeenCalled();
        });

        it('turns debug on for the tab and reloads it', async () => {
            expect(await send('enable')).toEqual({ available: true, enabled: true, devtools: false });
            expect(debugTabs.has(TAB_ID)).toBe(true);
            expect(reload).toHaveBeenCalledOnceWith(TAB_ID);
        });

        it('turns debug off for the tab and reloads it', async () => {
            await send('enable');
            reload.calls.reset();

            expect(await send('disable')).toEqual({ available: true, enabled: false, devtools: false });
            expect(debugTabs.has(TAB_ID)).toBe(false);
            expect(reload).toHaveBeenCalledOnceWith(TAB_ID);
        });

        it('does not reload a tab already in the requested state', async () => {
            await send('disable');
            await send('enable');
            reload.calls.reset();
            await send('enable');

            expect(reload).not.toHaveBeenCalled();
        });

        it('answers an unknown action as unavailable', async () => {
            expect(await messageHandlers.tabDebug({ action: 'toggle' }, sender)).toEqual({ available: false });
            expect(debugTabs.has(TAB_ID)).toBe(false);
        });

        it('keeps the tabs for a new instance, as after a background restart', async () => {
            await send('enable');

            const restarted = new DebugTabs({ debugBuild: true });
            await restarted.ready;

            expect(restarted.has(TAB_ID)).toBe(true);
        });

        it('forgets a tab when it closes', async () => {
            await send('enable');
            const listeners = browser.tabs.onRemoved._listeners;
            listeners[listeners.length - 1](TAB_ID, {});

            expect(debugTabs.has(TAB_ID)).toBe(false);
        });
    });

    describe('in a release build', () => {
        it('answers every action as unavailable and changes nothing', async () => {
            const debugTabs = new DebugTabs({ debugBuild: false });
            await debugTabs.ready;

            for (const action of ['get', 'enable', 'disable']) {
                expect(await send(action)).toEqual({ available: false });
            }
            expect(debugTabs.has(TAB_ID)).toBe(false);
            expect(reload).not.toHaveBeenCalled();
        });
    });
});
