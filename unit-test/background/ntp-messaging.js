import browser from 'webextension-polyfill';
import NTPMessaging from '../../shared/js/background/components/ntp-messaging';
import { NewTabTrackerStats } from '../../shared/js/background/newtab-tracker-stats';
import { TrackerStats } from '../../shared/js/background/classes/tracker-stats';
import { MockSettings } from '../helpers/mocks';

describe('NTPMessaging component', () => {
    /** @type {NTPMessaging} */
    let ntpMessaging;
    /** @type {MockSettings} */
    let settings;
    /** @type {NewTabTrackerStats} */
    let newTabTrackerStats;
    let changedListeners;

    const favorite = { id: '7', title: 'Example', url: 'https://www.example.co.uk/a?b' };
    const pageFavorite = {
        ...favorite,
        etldPlusOne: 'example.co.uk',
        favicon: { src: '/_favicon/?pageUrl=https%3A%2F%2Fwww.example.co.uk%2Fa%3Fb&size=64&', maxAvailableSize: 64 },
    };

    /**
     * Minimal stand-in for a runtime Port connected to the NTP page.
     */
    function createFakePort() {
        return {
            name: 'ntp-windows-interop',
            posted: [],
            postMessage(msg) {
                this.posted.push(msg);
            },
            sender: {},
        };
    }

    /**
     * Build a request message in the windows wire format the page sends.
     */
    function requestMessage(name, data = {}, id = 'test-id-1') {
        return {
            Feature: 'specialPages',
            SubFeatureName: 'newTabPage',
            Name: name,
            Data: data,
            Id: id,
        };
    }

    beforeEach(() => {
        changedListeners = [];
        chrome.ddg = {
            getFavorites: () => Promise.resolve([favorite]),
            moveFavorite: jasmine.createSpy('moveFavorite').and.resolveTo(),
            showAddFavoriteBubble: jasmine.createSpy('showAddFavoriteBubble').and.resolveTo(true),
            onFavoritesChanged: { addListener: (listener) => changedListeners.push(listener) },
        };
        settings = new MockSettings();
        newTabTrackerStats = new NewTabTrackerStats(new TrackerStats());
        // @ts-ignore - MockSettings stands in for Settings
        ntpMessaging = new NTPMessaging({ settings, newTabTrackerStats });
    });

    afterEach(() => {
        delete chrome.ddg;
    });

    it('answers initialSetup with a valid minimal payload', async () => {
        const result = await ntpMessaging.handleRequest('initialSetup');

        expect(result.widgets).toEqual([{ id: 'omnibar' }, { id: 'favorites' }, { id: 'protections' }]);
        expect(result.widgetConfigs).toEqual([
            { id: 'omnibar', visibility: 'visible' },
            { id: 'favorites', visibility: 'visible' },
            { id: 'protections', visibility: 'visible' },
        ]);
        expect(result.platform).toEqual({ name: 'windows' });
        expect(['development', 'production']).toContain(result.env);
        expect(typeof result.locale).toBe('string');
        expect(result.updateNotification).toBeNull();
    });

    it('answers the stubbed widget requests with empty data', async () => {
        expect(await ntpMessaging.handleRequest('omnibar_getConfig')).toEqual({
            mode: 'search',
            enableAi: false,
            showAiSetting: false,
            enableRecentAiChats: false,
        });
        expect(await ntpMessaging.handleRequest('omnibar_getSuggestions', { term: 'test' })).toEqual({
            suggestions: { topHits: [], duckduckgoSuggestions: [], localSuggestions: [] },
        });
        expect(await ntpMessaging.handleRequest('favorites_getConfig')).toEqual({ expansion: 'expanded' });
        expect(await ntpMessaging.handleRequest('protections_getConfig')).toEqual({ expansion: 'expanded', feed: 'privacy-stats' });
        expect(await ntpMessaging.handleRequest('activity_getUrls')).toEqual({ urls: [], totalTrackersBlocked: 0 });
        expect(await ntpMessaging.handleRequest('activity_getDataForUrls', { urls: [] })).toEqual({ activity: [] });
    });

    it('answers protections_getData with the total blocked count', async () => {
        const now = Date.now();
        newTabTrackerStats.stats.increment('Google', now);
        newTabTrackerStats.stats.increment('Google', now);
        newTabTrackerStats.stats.increment('Facebook', now);

        const result = await ntpMessaging.handleRequest('protections_getData');
        expect(result).toEqual({ totalCount: 3 });
    });

    it('answers stats_getData with per-company counts, mapping "other" to the NTP identifier and placing it last', async () => {
        const now = Date.now();
        const stats = newTabTrackerStats.stats;
        // 'other' has the highest count, but must still be listed last
        for (let i = 0; i < 5; i++) {
            stats.increment(NewTabTrackerStats.otherCompaniesKey, now);
        }
        stats.increment('Google', now);
        stats.increment('Google', now);
        stats.increment('Facebook', now);

        const result = await ntpMessaging.handleRequest('stats_getData');
        expect(result.trackerCompanies).toEqual([
            { displayName: 'Google', count: 2 },
            { displayName: 'Facebook', count: 1 },
            { displayName: '__other__', count: 5 },
        ]);
    });

    it('opens searches and suggestions from the omnibar', async () => {
        const openUrl = spyOn(ntpMessaging, 'openUrl');
        const port = createFakePort();

        // @ts-ignore - fake port
        await ntpMessaging.onMessage(
            { ...requestMessage('omnibar_submitSearch', { term: 'a b', target: 'same-tab' }), Id: undefined },
            port,
        );
        expect(openUrl).toHaveBeenCalledWith('https://duckduckgo.com/?q=a%20b', 'same-tab', port);

        const suggestion = { kind: 'phrase', phrase: 'query' };
        // @ts-ignore - fake port
        await ntpMessaging.onMessage(
            { ...requestMessage('omnibar_openSuggestion', { suggestion, target: 'same-tab' }), Id: undefined },
            port,
        );
        expect(openUrl).toHaveBeenCalledWith('https://duckduckgo.com/?q=query', 'same-tab', port);

        // @ts-ignore - fake port
        await ntpMessaging.onMessage(
            { ...requestMessage('favorites_open', { id: 'x', url: 'https://example.com/', target: 'new-tab' }), Id: undefined },
            port,
        );
        // favorites and activity links open new tabs in the background
        expect(openUrl).toHaveBeenCalledWith('https://example.com/', 'new-tab', port, false);

        // @ts-ignore - fake port
        await ntpMessaging.onMessage(
            { ...requestMessage('activity_open', { url: 'https://example.com/a', target: 'new-tab' }), Id: undefined },
            port,
        );
        expect(openUrl).toHaveBeenCalledWith('https://example.com/a', 'new-tab', port, false);
    });

    it('opens new tabs next to the NTP, same-tab links in the NTP and new-window links in a window', () => {
        const create = spyOn(browser.tabs, 'create').and.returnValue(Promise.resolve({}));
        const update = spyOn(browser.tabs, 'update').and.returnValue(Promise.resolve({}));
        const createWindow = spyOn(browser.windows, 'create').and.returnValue(Promise.resolve({}));
        const port = { ...createFakePort(), sender: { tab: { id: 7, index: 2, windowId: 3 } } };

        // @ts-ignore - fake port
        ntpMessaging.openUrl('https://a.example/', 'new-tab', port);
        expect(create).toHaveBeenCalledWith({ url: 'https://a.example/', active: true, windowId: 3, index: 3, openerTabId: 7 });

        // @ts-ignore - fake port
        ntpMessaging.openUrl('https://a.example/', 'new-tab', port, false);
        expect(create).toHaveBeenCalledWith({ url: 'https://a.example/', active: false, windowId: 3, index: 3, openerTabId: 7 });

        // @ts-ignore - fake port
        ntpMessaging.openUrl('https://b.example/', 'same-tab', port);
        expect(update).toHaveBeenCalledWith(7, { url: 'https://b.example/' });

        // @ts-ignore - fake port
        ntpMessaging.openUrl('https://c.example/', 'new-tab', createFakePort());
        expect(create).toHaveBeenCalledWith({ url: 'https://c.example/', active: true });

        // @ts-ignore - fake port
        ntpMessaging.openUrl('https://d.example/', 'new-window', port);
        expect(createWindow).toHaveBeenCalledWith({ url: 'https://d.example/' });
    });

    it('responds to requests on the port with a matching id', async () => {
        const port = createFakePort();
        // @ts-ignore - fake port
        await ntpMessaging.onMessage(requestMessage('protections_getData', {}, 'abc-123'), port);

        expect(port.posted).toEqual([
            {
                context: 'specialPages',
                featureName: 'newTabPage',
                id: 'abc-123',
                result: { totalCount: 0 },
            },
        ]);
    });

    it('responds with an error for unknown request methods', async () => {
        const port = createFakePort();
        // @ts-ignore - fake port
        await ntpMessaging.onMessage(requestMessage('not_a_real_method'), port);

        expect(port.posted.length).toBe(1);
        expect(port.posted[0].id).toBe('test-id-1');
        expect(port.posted[0].error.message).toContain('not_a_real_method');
    });

    it('ignores messages for other features', async () => {
        const port = createFakePort();
        // @ts-ignore - fake port
        await ntpMessaging.onMessage({ Feature: 'contentScopeScripts', SubFeatureName: 'other', Name: 'x', Id: '1' }, port);
        expect(port.posted).toEqual([]);
    });

    it('persists widget, favorites and protections config from notifications', async () => {
        const widgetConfigs = [{ id: 'protections', visibility: 'hidden' }];
        const favoritesConfig = { expansion: 'collapsed' };
        const protectionsConfig = { expansion: 'collapsed', feed: 'activity' };

        const port = createFakePort();
        // @ts-ignore - fake port
        await ntpMessaging.onMessage({ ...requestMessage('widgets_setConfig', widgetConfigs), Id: undefined }, port);
        // @ts-ignore - fake port
        await ntpMessaging.onMessage({ ...requestMessage('favorites_setConfig', favoritesConfig), Id: undefined }, port);
        // @ts-ignore - fake port
        await ntpMessaging.onMessage({ ...requestMessage('protections_setConfig', protectionsConfig), Id: undefined }, port);

        // notifications never get a response
        expect(port.posted).toEqual([]);

        expect((await ntpMessaging.handleRequest('initialSetup')).widgetConfigs).toEqual(widgetConfigs);
        expect(await ntpMessaging.handleRequest('favorites_getConfig')).toEqual(favoritesConfig);
        expect(await ntpMessaging.handleRequest('protections_getConfig')).toEqual(protectionsConfig);
    });

    describe('favorites', () => {
        it('answers favorites_getData from the browser', async () => {
            expect(await ntpMessaging.handleRequest('favorites_getData')).toEqual({ favorites: [pageFavorite] });
        });

        it('moves favorites in the browser', async () => {
            await ntpMessaging.handleNotification('favorites_move', { id: '7', fromIndex: 0, targetIndex: 2 });
            expect(chrome.ddg.moveFavorite).toHaveBeenCalledWith('7', 2);

            await ntpMessaging.handleNotification('favorites_move', { id: '7', targetIndex: 'x' });
            expect(chrome.ddg.moveFavorite).toHaveBeenCalledTimes(1);
        });

        it('pushes the browser order back and logs when a move fails', async () => {
            const error = new Error('The id is not a favorite.');
            chrome.ddg.moveFavorite = jasmine.createSpy('moveFavorite').and.rejectWith(error);
            const consoleError = spyOn(console, 'error');
            const port = createFakePort();
            // @ts-ignore - fake port
            ntpMessaging.ports.add(port);

            // @ts-ignore - fake port
            await ntpMessaging.onMessage({ ...requestMessage('favorites_move', { id: '7', targetIndex: 0 }), Id: undefined }, port);
            expect(port.posted.map((msg) => msg.params)).toEqual([{ favorites: [pageFavorite] }]);
            expect(consoleError).toHaveBeenCalledWith('NTP favorites_move failed:', error);
        });

        it('opens the browser add favorite dialog over the NTP tab, and logs when it does not open', async () => {
            const consoleError = spyOn(console, 'error');
            const tabPort = { ...createFakePort(), sender: { tab: { id: 7 } } };
            // @ts-ignore - fake port
            const add = (port) => ntpMessaging.onMessage({ ...requestMessage('favorites_add'), Id: undefined }, port);

            await add(tabPort);
            expect(chrome.ddg.showAddFavoriteBubble).toHaveBeenCalledWith(7);
            expect(consoleError).not.toHaveBeenCalled();

            // the browser declines, or there is no tab to open it over
            chrome.ddg.showAddFavoriteBubble.and.resolveTo(false);
            await add(tabPort);
            await add(createFakePort());
            expect(chrome.ddg.showAddFavoriteBubble).toHaveBeenCalledTimes(2);
            expect(consoleError.calls.allArgs().map(([message]) => message)).toEqual([
                'NTP favorites_add failed:',
                'NTP favorites_add failed:',
            ]);
        });

        it('pushes favorites to connected pages when the browser reports a change', async () => {
            const port = createFakePort();
            // @ts-ignore - fake port
            ntpMessaging.ports.add(port);

            expect(changedListeners.length).toBe(1);
            await changedListeners[0]();

            expect(port.posted).toEqual([
                {
                    context: 'specialPages',
                    featureName: 'newTabPage',
                    subscriptionName: 'favorites_onDataUpdate',
                    params: { favorites: [pageFavorite] },
                },
            ]);
        });

        it('pushes favorites to each page as it connects', async () => {
            let onConnect;
            spyOn(browser.runtime.onConnect, 'addListener').and.callFake((listener) => {
                onConnect = listener;
            });
            // @ts-ignore - MockSettings stands in for Settings
            ntpMessaging = new NTPMessaging({ settings, newTabTrackerStats });

            const connect = async () => {
                const port = { ...createFakePort(), onMessage: { addListener() {} }, onDisconnect: { addListener() {} } };
                onConnect(port);
                await new Promise((resolve) => setTimeout(resolve));
                return port;
            };
            const first = await connect();
            const second = await connect();

            expect(first.posted.map((msg) => msg.subscriptionName)).toEqual(['favorites_onDataUpdate']);
            expect(second.posted.map((msg) => msg.subscriptionName)).toEqual(['favorites_onDataUpdate']);
        });
    });

    // Another browser has no chrome.ddg; an older or broken one lacks members.
    describe('when the browser lacks the favorites API', () => {
        /** @type {jasmine.Spy} */
        let consoleError;

        beforeEach(() => {
            consoleError = spyOn(console, 'error');
        });

        it('logs that favorites will not update', () => {
            for (const ddg of [undefined, {}]) {
                chrome.ddg = ddg;
                // @ts-ignore - MockSettings stands in for Settings
                new NTPMessaging({ settings, newTabTrackerStats }); // eslint-disable-line no-new
            }
            expect(consoleError).toHaveBeenCalledTimes(2);
        });

        it('answers favorites_getData with an error naming what is missing', async () => {
            const errorFor = async (ddg) => {
                chrome.ddg = ddg;
                const port = createFakePort();
                // @ts-ignore - fake port
                await ntpMessaging.onMessage(requestMessage('favorites_getData'), port);
                return port.posted[0].error.message;
            };
            expect(await errorFor(undefined)).toBe('chrome.ddg is unavailable');
            expect(await errorFor({})).toContain('getFavorites');
        });

        it('logs the favorites notifications it cannot carry out', async () => {
            chrome.ddg = {};
            const port = { ...createFakePort(), sender: { tab: { id: 7 } } };
            // @ts-ignore - fake port
            await ntpMessaging.onMessage({ ...requestMessage('favorites_move', { id: '7', targetIndex: 0 }), Id: undefined }, port);
            // @ts-ignore - fake port
            await ntpMessaging.onMessage({ ...requestMessage('favorites_add'), Id: undefined }, port);

            const failure = (member) => jasmine.objectContaining({ message: jasmine.stringContaining(member) });
            expect(consoleError).toHaveBeenCalledWith('NTP favorites_move failed:', failure('moveFavorite'));
            expect(consoleError).toHaveBeenCalledWith('NTP favorites_add failed:', failure('showAddFavoriteBubble'));
        });
    });

    it('broadcasts subscription events to connected ports', () => {
        const port = createFakePort();
        // @ts-ignore - fake port
        ntpMessaging.ports.add(port);

        newTabTrackerStats.stats.increment('Google', Date.now());
        ntpMessaging.pushDataUpdate();

        expect(port.posted).toEqual([
            {
                context: 'specialPages',
                featureName: 'newTabPage',
                subscriptionName: 'protections_onDataUpdate',
                params: { totalCount: 1 },
            },
            {
                context: 'specialPages',
                featureName: 'newTabPage',
                subscriptionName: 'stats_onDataUpdate',
                params: { trackerCompanies: [{ displayName: 'Google', count: 1 }] },
            },
        ]);
    });
});
