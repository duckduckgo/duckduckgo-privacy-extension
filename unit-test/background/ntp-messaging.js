import browser from 'webextension-polyfill';
import NTPMessaging from '../../shared/js/background/components/ntp-messaging';
import { NewTabTrackerStats } from '../../shared/js/background/newtab-tracker-stats';
import { TrackerStats } from '../../shared/js/background/classes/tracker-stats';
import { MockSettings } from '../helpers/mocks';
import { setToSessionStorage } from '../../shared/js/background/wrapper';

describe('NTPMessaging component', () => {
    /** @type {NTPMessaging} */
    let ntpMessaging;
    /** @type {MockSettings} */
    let settings;
    /** @type {NewTabTrackerStats} */
    let newTabTrackerStats;
    let changedListeners;
    /** @type {Map<string, import('../../shared/js/background/components/ntp-activity').SiteActivity>} */
    let activitySites;
    /** @type {jasmine.Spy} */
    let removeDomain;
    /** @type {any} */
    let ntpActivity;

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
            onBurnStarted: { addListener() {} },
        };
        settings = new MockSettings();
        newTabTrackerStats = new NewTabTrackerStats(new TrackerStats());
        activitySites = new Map();
        removeDomain = jasmine.createSpy('removeDomain').and.returnValue(Promise.resolve());
        ntpActivity = Object.assign(new EventTarget(), { getSites: () => Promise.resolve(activitySites), removeDomain });
        // @ts-ignore - MockSettings and ntpActivity stand in for Settings and NTPActivity
        ntpMessaging = new NTPMessaging({ settings, newTabTrackerStats, ntpActivity });
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
        expect(result).toEqual({ totalCount: 3, totalCookiePopUpsBlocked: null });
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

    it('empties the tracker total and company list on a burn, once they are restored, and pushes that', async () => {
        let burn;
        chrome.ddg = { onBurnStarted: { addListener: (listener) => (burn = listener) } };
        let restore;
        const statsRestored = new Promise((resolve) => (restore = resolve));
        // @ts-ignore - MockSettings and ntpActivity stand in for Settings and NTPActivity
        ntpMessaging = new NTPMessaging({ settings, newTabTrackerStats, statsRestored, ntpActivity });
        delete chrome.ddg;
        const port = createFakePort();
        // @ts-ignore - fake port
        ntpMessaging.ports.add(port);
        const syncToStorage = spyOn(newTabTrackerStats, 'syncToStorage').and.resolveTo();

        const burned = burn({ trigger: 'in-session' });
        // the restore lands after the burn started
        newTabTrackerStats.stats.increment('Google', Date.now());
        restore();
        await burned;

        expect(port.posted.map((msg) => msg.params)).toEqual([{ totalCount: 0, totalCookiePopUpsBlocked: null }, { trackerCompanies: [] }]);
        expect(syncToStorage).toHaveBeenCalled();
    });

    describe('activity feed', () => {
        const MINUTE = 60 * 1000;

        beforeEach(() => {
            const now = Date.now();
            activitySites.set('example.com', {
                pages: [
                    { url: 'https://www.example.com/b', title: 'Page B', lastVisitTime: now - 5 * MINUTE },
                    // untitled pages are not listed
                    { url: 'https://www.example.com/', title: ' ', lastVisitTime: now - 6 * MINUTE },
                    { url: 'http://example.com/a', title: 'Page A', lastVisitTime: now - 30 * 60 * MINUTE },
                ],
                trackersFound: true,
                trackersBlocked: 3,
                companies: ['Google', 'Facebook'],
            });
            activitySites.set('plain.example', {
                pages: [{ url: 'http://plain.example/', title: 'Plain', lastVisitTime: now }],
                trackersFound: false,
                trackersBlocked: 0,
                companies: [],
            });
        });

        it('lists sites by their https URL unless none of their pages is https', async () => {
            expect(await ntpMessaging.handleRequest('activity_getUrls')).toEqual({
                urls: ['https://example.com/', 'http://plain.example/'],
                totalTrackersBlocked: 3,
            });
        });

        it('answers activity_getDataForUrls with the requested sites that have activity', async () => {
            const { activity } = await ntpMessaging.handleRequest('activity_getDataForUrls', {
                urls: ['https://example.com/', 'https://gone.example/', 'http://plain.example/'],
            });

            expect(activity.map(({ url }) => url)).toEqual(['https://example.com/', 'http://plain.example/']);
            expect(activity[0]).toEqual({
                title: 'example.com',
                url: 'https://example.com/',
                etldPlusOne: 'example.com',
                favicon: { src: '/_favicon/?pageUrl=https%3A%2F%2Fwww.example.com%2Fb&size=64&', maxAvailableSize: 64 },
                trackingStatus: { totalCount: 3, trackerCompanies: [{ displayName: 'Google' }, { displayName: 'Facebook' }] },
                trackersFound: true,
                history: [
                    { title: 'Page B', url: 'https://www.example.com/b', relativeTime: '5 minutes ago' },
                    { title: 'Page A', url: 'http://example.com/a', relativeTime: '1 day ago' },
                ],
                favorite: false,
            });
            expect(activity[1]).toEqual(
                jasmine.objectContaining({
                    trackingStatus: { totalCount: 0, trackerCompanies: [] },
                    trackersFound: false,
                    history: [{ title: 'Plain', url: 'http://plain.example/', relativeTime: 'now' }],
                }),
            );
        });

        it('lists at most 10 pages for a site', async () => {
            const pageUrls = Array.from({ length: 12 }, (_, i) => `https://many.example/${i}`);
            activitySites.set('many.example', {
                pages: pageUrls.map((url, i) => ({ url, title: `Page ${i}`, lastVisitTime: Date.now() - i })),
                trackersFound: false,
                trackersBlocked: 0,
                companies: [],
            });

            const { activity } = await ntpMessaging.handleRequest('activity_getDataForUrls', { urls: ['https://many.example/'] });
            expect(activity[0].history.map(({ url }) => url)).toEqual(pageUrls.slice(0, 10));
        });

        it('removes a site from the feed', async () => {
            // @ts-ignore - fake port
            await ntpMessaging.onMessage(
                { ...requestMessage('activity_removeItem', { url: 'https://example.com/' }), Id: undefined },
                createFakePort(),
            );
            expect(removeDomain).toHaveBeenCalledOnceWith('example.com');
        });

        it('pushes the changed sites that still have activity as patches', async () => {
            const port = createFakePort();
            // @ts-ignore - fake port
            ntpMessaging.ports.add(port);
            const urlInfo = { urls: ['https://example.com/', 'http://plain.example/'], totalTrackersBlocked: 3 };

            await ntpMessaging.pushActivityUpdate(['plain.example', 'gone.example', 'plain.example']);
            await ntpMessaging.pushActivityUpdate(['gone.example']);

            expect(port.posted.map(({ subscriptionName }) => subscriptionName)).toEqual(['activity_onDataPatch', 'activity_onDataPatch']);
            expect(port.posted[0].params).toEqual({ ...urlInfo, patch: jasmine.objectContaining({ url: 'http://plain.example/' }) });
            expect(port.posted[1].params).toEqual(urlInfo);
        });
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
                result: { totalCount: 0, totalCookiePopUpsBlocked: null },
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

    it('sends a new protections config to every open page', async () => {
        const protectionsConfig = { expansion: 'collapsed', feed: 'activity' };
        const sender = createFakePort();
        const other = createFakePort();
        // @ts-ignore - fake ports
        [sender, other].forEach((port) => ntpMessaging.ports.add(port));

        // @ts-ignore - fake port
        await ntpMessaging.onMessage({ ...requestMessage('protections_setConfig', protectionsConfig), Id: undefined }, sender);

        for (const port of [sender, other]) {
            expect(port.posted).toEqual([
                {
                    context: 'specialPages',
                    featureName: 'newTabPage',
                    subscriptionName: 'protections_onConfigUpdate',
                    params: protectionsConfig,
                },
            ]);
        }
    });

    it('sends a new widget config to every open page', async () => {
        const widgetConfigs = [{ id: 'protections', visibility: 'hidden' }];
        const sender = createFakePort();
        const other = createFakePort();
        // @ts-ignore - fake ports
        [sender, other].forEach((port) => ntpMessaging.ports.add(port));

        // @ts-ignore - fake port
        await ntpMessaging.onMessage({ ...requestMessage('widgets_setConfig', widgetConfigs), Id: undefined }, sender);

        for (const port of [sender, other]) {
            expect(port.posted.map((msg) => [msg.subscriptionName, msg.params])).toEqual([['widgets_onConfigUpdated', widgetConfigs]]);
        }
    });

    describe('context menu', () => {
        const visibilityMenuItems = [
            { id: 'omnibar', title: 'Search' },
            { id: 'favorites', title: 'Favorites' },
            { id: 'protections', title: 'Protections Report' },
        ];
        /** @type {any} */
        let sender;
        /** @type {any} */
        let other;

        beforeEach(() => {
            chrome.ddg = {};
            settings.updateSetting('ntpWidgetConfigs', [
                { id: 'omnibar', visibility: 'visible' },
                { id: 'favorites', visibility: 'visible' },
                { id: 'protections', visibility: 'hidden' },
            ]);
            sender = { ...createFakePort(), sender: { tab: { id: 7 } } };
            other = createFakePort();
            [sender, other].forEach((port) => ntpMessaging.ports.add(port));
        });

        afterEach(() => {
            delete chrome.ddg;
        });

        it('shows the widgets over the NTP tab, checked if visible, and toggles the one chosen for every open page', async () => {
            chrome.ddg.showContextMenu = jasmine.createSpy('showContextMenu').and.resolveTo('favorites');

            await ntpMessaging.handleNotification('contextMenu', { visibilityMenuItems }, sender);

            expect(chrome.ddg.showContextMenu).toHaveBeenCalledOnceWith(7, [
                { id: 'omnibar', title: 'Search', checked: true },
                { id: 'favorites', title: 'Favorites', checked: true },
                { id: 'protections', title: 'Protections Report', checked: false },
            ]);
            const widgetConfigs = [
                { id: 'omnibar', visibility: 'visible' },
                { id: 'favorites', visibility: 'hidden' },
                { id: 'protections', visibility: 'hidden' },
            ];
            expect((await ntpMessaging.handleRequest('initialSetup')).widgetConfigs).toEqual(widgetConfigs);
            for (const port of [sender, other]) {
                expect(port.posted.map((msg) => [msg.subscriptionName, msg.params])).toEqual([['widgets_onConfigUpdated', widgetConfigs]]);
            }
        });

        it('changes nothing when the menu closes without a choice', async () => {
            chrome.ddg.showContextMenu = jasmine.createSpy('showContextMenu').and.resolveTo(undefined);

            await ntpMessaging.handleNotification('contextMenu', { visibilityMenuItems }, sender);

            expect(chrome.ddg.showContextMenu).toHaveBeenCalledTimes(1);
            expect((await ntpMessaging.handleRequest('initialSetup')).widgetConfigs[2]).toEqual({
                id: 'protections',
                visibility: 'hidden',
            });
            expect(sender.posted).toEqual([]);
            expect(other.posted).toEqual([]);
        });

        it('logs when there is no tab to show the menu over, or no items', async () => {
            chrome.ddg.showContextMenu = jasmine.createSpy('showContextMenu');
            const consoleError = spyOn(console, 'error');
            // @ts-ignore - fake port
            const notify = (data, port) => ntpMessaging.onMessage({ ...requestMessage('contextMenu', data), Id: undefined }, port);

            await notify({ visibilityMenuItems }, createFakePort());
            await notify({}, sender);

            expect(chrome.ddg.showContextMenu).not.toHaveBeenCalled();
            expect(consoleError.calls.allArgs().map(([message]) => message)).toEqual([
                'NTP contextMenu failed:',
                'NTP contextMenu failed:',
            ]);
        });
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

        describe('in the activity feed', () => {
            const other = { id: '8', title: 'Other', url: 'https://other.example/' };

            beforeEach(async () => {
                const now = Date.now();
                activitySites.set('example.co.uk', {
                    pages: [
                        { url: 'https://www.example.co.uk/', title: 'Latest', lastVisitTime: now },
                        { url: 'https://example.co.uk/c', title: 'Older', lastVisitTime: now - 1 },
                    ],
                    trackersFound: false,
                    trackersBlocked: 0,
                    companies: [],
                });
                activitySites.set('other.example', {
                    pages: [{ url: 'https://other.example/', title: 'Other', lastVisitTime: now }],
                    trackersFound: false,
                    trackersBlocked: 0,
                    companies: [],
                });
                chrome.ddg.getFavorites = () => Promise.resolve([other]);
                await setToSessionStorage('ntpStarredUrls', undefined);
            });

            it('stars the sites whose URL is a favorite', async () => {
                const { activity } = await ntpMessaging.handleRequest('activity_getDataForUrls', {
                    urls: ['https://example.co.uk/', 'https://other.example/'],
                });
                expect(activity.map((item) => item.favorite)).toEqual([false, true]);
            });

            it('adds a favorite titled like the latest page or the domain, and removes one', async () => {
                chrome.ddg.addFavorite = jasmine.createSpy('addFavorite').and.resolveTo();
                chrome.ddg.removeFavorite = jasmine.createSpy('removeFavorite').and.resolveTo();

                await ntpMessaging.handleNotification('activity_addFavorite', { url: 'https://example.co.uk/' });
                await ntpMessaging.handleNotification('activity_addFavorite', { url: 'https://gone.example/' });
                await ntpMessaging.handleNotification('activity_removeFavorite', { url: 'https://other.example/' });

                expect(chrome.ddg.addFavorite.calls.allArgs()).toEqual([
                    ['https://example.co.uk/', 'Latest'],
                    ['https://gone.example/', 'gone.example'],
                ]);
                expect(chrome.ddg.removeFavorite).toHaveBeenCalledOnceWith('https://other.example/');
            });

            it('puts the star back and logs when the browser fails to change it', async () => {
                const error = new Error('not loaded');
                chrome.ddg.addFavorite = jasmine.createSpy('addFavorite').and.rejectWith(error);
                chrome.ddg.removeFavorite = jasmine.createSpy('removeFavorite').and.rejectWith(error);
                const queue = spyOn(ntpMessaging, 'queueActivityPush');
                const consoleError = spyOn(console, 'error');
                // @ts-ignore - fake port
                const notify = (name, url) => ntpMessaging.onMessage({ ...requestMessage(name, { url }), Id: undefined }, createFakePort());

                await notify('activity_addFavorite', 'https://example.co.uk/');
                await notify('activity_removeFavorite', 'https://other.example/');

                expect(queue.calls.allArgs()).toEqual([[['example.co.uk']], [['other.example']]]);
                expect(consoleError.calls.allArgs()).toEqual([
                    ['NTP activity_addFavorite failed:', error],
                    ['NTP activity_removeFavorite failed:', error],
                ]);
            });

            it('patches the sites whose star changed in the browser', async () => {
                const queue = spyOn(ntpMessaging, 'queueActivityPush');

                await changedListeners[0]();
                expect(queue).toHaveBeenCalledWith(['other.example']);

                chrome.ddg.getFavorites = () => Promise.resolve([{ ...other, url: 'https://example.co.uk/' }]);
                await changedListeners[0]();
                expect(queue).toHaveBeenCalledWith(['example.co.uk', 'other.example']);
            });

            it('patches a star the page was given before the worker restarted', async () => {
                await ntpMessaging.handleRequest('activity_getDataForUrls', { urls: ['https://other.example/'] });
                changedListeners = [];
                // @ts-ignore - MockSettings and ntpActivity stand in for Settings and NTPActivity
                ntpMessaging = new NTPMessaging({ settings, newTabTrackerStats, ntpActivity });
                const queue = spyOn(ntpMessaging, 'queueActivityPush');

                chrome.ddg.getFavorites = () => Promise.resolve([]);
                await changedListeners[0]();
                expect(queue).toHaveBeenCalledWith(['other.example']);
            });
        });

        it('pushes favorites to connected pages when the browser reports a change', async () => {
            spyOn(ntpMessaging, 'queueActivityPush');
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
            ntpMessaging = new NTPMessaging({ settings, newTabTrackerStats, ntpActivity });

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
    describe('when the browser lacks the chrome.ddg API', () => {
        /** @type {jasmine.Spy} */
        let consoleError;
        const failure = (member) => jasmine.objectContaining({ message: jasmine.stringContaining(member) });

        beforeEach(() => {
            consoleError = spyOn(console, 'error');
        });

        it('logs the events it cannot listen to', () => {
            for (const ddg of [undefined, {}]) {
                chrome.ddg = ddg;
                // @ts-ignore - MockSettings stands in for Settings
                new NTPMessaging({ settings, newTabTrackerStats, ntpActivity }); // eslint-disable-line no-new
            }
            expect(consoleError.calls.allArgs().map(([message]) => message.split(' ')[0])).toEqual([
                'chrome.ddg.onFavoritesChanged',
                'chrome.ddg.onBurnStarted',
                'chrome.ddg.onFavoritesChanged',
                'chrome.ddg.onBurnStarted',
            ]);
        });

        it('answers favorites and activity requests with an error naming what is missing', async () => {
            const errorFor = async (ddg, name, data) => {
                chrome.ddg = ddg;
                const port = createFakePort();
                // @ts-ignore - fake port
                await ntpMessaging.onMessage(requestMessage(name, data), port);
                return port.posted[0].error.message;
            };
            expect(await errorFor(undefined, 'favorites_getData')).toBe('chrome.ddg is unavailable');
            expect(await errorFor({}, 'favorites_getData')).toContain('getFavorites');
            expect(await errorFor({}, 'activity_getDataForUrls', { urls: [] })).toContain('getFavorites');
        });

        it('logs the favorites notifications it cannot carry out', async () => {
            chrome.ddg = {};
            spyOn(ntpMessaging, 'queueActivityPush');
            const port = { ...createFakePort(), sender: { tab: { id: 7 } } };
            // @ts-ignore - fake port
            const notify = (name, data) => ntpMessaging.onMessage({ ...requestMessage(name, data), Id: undefined }, port);

            await notify('favorites_move', { id: '7', targetIndex: 0 });
            await notify('favorites_add');
            await notify('activity_addFavorite', { url: 'https://example.com/' });
            await notify('activity_removeFavorite', { url: 'https://example.com/' });
            await notify('contextMenu', { visibilityMenuItems: [{ id: 'omnibar', title: 'Search' }] });

            expect(consoleError).toHaveBeenCalledWith('NTP favorites_move failed:', failure('moveFavorite'));
            expect(consoleError).toHaveBeenCalledWith('NTP favorites_add failed:', failure('showAddFavoriteBubble'));
            expect(consoleError).toHaveBeenCalledWith('NTP activity_addFavorite failed:', failure('addFavorite'));
            expect(consoleError).toHaveBeenCalledWith('NTP activity_removeFavorite failed:', failure('removeFavorite'));
            expect(consoleError).toHaveBeenCalledWith('NTP contextMenu failed:', failure('showContextMenu'));
        });

        it('logs the favorites changes it cannot push', async () => {
            chrome.ddg = {};
            await changedListeners[0]();

            expect(consoleError).toHaveBeenCalledWith('NTP favorites_onDataUpdate failed:', failure('getFavorites'));
            expect(consoleError).toHaveBeenCalledWith('NTP activity_onDataPatch failed:', failure('getFavorites'));
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
                params: { totalCount: 1, totalCookiePopUpsBlocked: null },
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
