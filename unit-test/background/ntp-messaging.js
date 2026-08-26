import NTPMessaging, { toDomainActivity, formatRelativeTime } from '../../shared/js/background/components/ntp-messaging';
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
    /** Fake NTPActivityCollection with an in-memory store. */
    let fakeActivity;

    const NOW = Date.now();

    function makeRow(host, overrides = {}) {
        return {
            host,
            url: `https://${host}/`,
            etldPlusOne: host,
            lastVisit: NOW,
            totalCount: 0,
            companies: {},
            history: [],
            ...overrides,
        };
    }

    function createFakeActivity(rows = []) {
        return {
            _changeCallback: null,
            onChange(cb) {
                this._changeCallback = cb;
            },
            store: {
                rows,
                async getAll() {
                    return this.rows;
                },
                async get(host) {
                    return this.rows.find((r) => r.host === host);
                },
                async getForUrls(urls) {
                    return urls.map((url) => this.rows.find((r) => r.url === url)).filter(Boolean);
                },
                async removeByUrl(url) {
                    const before = this.rows.length;
                    this.rows = this.rows.filter((r) => r.url !== url);
                    return this.rows.length < before;
                },
            },
        };
    }

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
        settings = new MockSettings();
        fakeActivity = createFakeActivity();
        newTabTrackerStats = new NewTabTrackerStats(new TrackerStats());
        // @ts-ignore - MockSettings/fakeActivity stand in for the real dependencies
        ntpMessaging = new NTPMessaging({ settings, ntpActivity: fakeActivity, newTabTrackerStats });
    });

    it('answers initialSetup with a valid minimal payload', async () => {
        const result = await ntpMessaging.handleRequest('initialSetup');

        expect(result.widgets).toEqual([{ id: 'protections' }]);
        expect(result.widgetConfigs).toEqual([{ id: 'protections', visibility: 'visible' }]);
        expect(result.platform).toEqual({ name: 'windows' });
        expect(['development', 'production']).toContain(result.env);
        expect(typeof result.locale).toBe('string');
        expect(result.updateNotification).toBeNull();
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

    it('answers the batched activity API from the activity store', async () => {
        fakeActivity.store.rows = [
            makeRow('example.com', { totalCount: 5, companies: { Google: 3, Facebook: 2 } }),
            makeRow('other.com', { totalCount: 2, companies: { Google: 2 } }),
        ];

        const urlInfo = await ntpMessaging.handleRequest('activity_getUrls');
        expect(urlInfo).toEqual({
            urls: ['https://example.com/', 'https://other.com/'],
            totalTrackersBlocked: 7,
        });

        const data = await ntpMessaging.handleRequest('activity_getDataForUrls', { urls: ['https://other.com/'] });
        expect(data.activity.length).toBe(1);
        expect(data.activity[0].url).toBe('https://other.com/');
    });

    it('maps stored site rows to the DomainActivity format', () => {
        const row = makeRow('www.example.com', {
            etldPlusOne: 'example.com',
            totalCount: 3,
            companies: { Facebook: 1, Google: 2 },
            history: [{ title: 'Example Page', url: 'https://www.example.com/page', visitedAt: NOW - 5 * 60 * 1000 }],
        });

        const activity = toDomainActivity(row, NOW);
        expect(activity.title).toBe('www.example.com');
        expect(activity.url).toBe('https://www.example.com/');
        expect(activity.etldPlusOne).toBe('example.com');
        // the trailing '&' absorbs the '?preferredSize=N' suffix the page appends
        expect(activity.favicon).toEqual({
            src: '/_favicon/?pageUrl=https%3A%2F%2Fwww.example.com%2F&size=32&',
            maxAvailableSize: 32,
        });
        expect(activity.trackersFound).toBe(true);
        // companies ordered by blocked count, names only
        expect(activity.trackingStatus).toEqual({
            totalCount: 3,
            trackerCompanies: [{ displayName: 'Google' }, { displayName: 'Facebook' }],
        });
        expect(activity.history).toEqual([
            { title: 'Example Page', url: 'https://www.example.com/page', relativeTime: formatRelativeTime(NOW - 5 * 60 * 1000, NOW) },
        ]);
        expect(activity.favorite).toBe(false);
    });

    it('formats relative times as localized strings', () => {
        // exact strings depend on the locale; check shape and ordering only
        const justNow = formatRelativeTime(NOW - 10 * 1000, NOW);
        const minutes = formatRelativeTime(NOW - 5 * 60 * 1000, NOW);
        const hours = formatRelativeTime(NOW - 3 * 60 * 60 * 1000, NOW);
        const days = formatRelativeTime(NOW - 2 * 24 * 60 * 60 * 1000, NOW);
        for (const value of [justNow, minutes, hours, days]) {
            expect(typeof value).toBe('string');
            expect(value.length).toBeGreaterThan(0);
        }
        expect(minutes).toContain('5');
        expect(hours).toContain('3');
        expect(days).toContain('2');
    });

    it('removes activity items and pushes a full data update', async () => {
        fakeActivity.store.rows = [makeRow('example.com'), makeRow('other.com')];
        const port = createFakePort();
        // @ts-ignore - fake port
        ntpMessaging.ports.add(port);

        // @ts-ignore - fake port
        await ntpMessaging.onMessage({ ...requestMessage('activity_removeItem', { url: 'https://example.com/' }), Id: undefined }, port);

        expect(fakeActivity.store.rows.map((r) => r.host)).toEqual(['other.com']);
        expect(port.posted.length).toBe(1);
        expect(port.posted[0].subscriptionName).toBe('activity_onDataUpdate');
        expect(port.posted[0].params.activity.map((a) => a.url)).toEqual(['https://other.com/']);
    });

    it('pushes single-site patches when the activity collection reports changes', async () => {
        fakeActivity.store.rows = [makeRow('example.com', { totalCount: 4, companies: { Google: 4 } })];
        const port = createFakePort();
        // @ts-ignore - fake port
        ntpMessaging.ports.add(port);

        await ntpMessaging.pushActivityPatches(['example.com']);

        expect(port.posted.length).toBe(1);
        expect(port.posted[0].subscriptionName).toBe('activity_onDataPatch');
        expect(port.posted[0].params.urls).toEqual(['https://example.com/']);
        expect(port.posted[0].params.totalTrackersBlocked).toBe(4);
        expect(port.posted[0].params.patch.url).toBe('https://example.com/');
    });

    it('registers for activity change notifications', () => {
        expect(typeof fakeActivity._changeCallback).toBe('function');
    });

    it('answers activity_confirmBurn with no action', async () => {
        expect(await ntpMessaging.handleRequest('activity_confirmBurn', { url: 'https://example.com/' })).toEqual({ action: 'none' });
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

    it('persists widget and protections config from notifications', async () => {
        const widgetConfigs = [{ id: 'protections', visibility: 'hidden' }];
        const protectionsConfig = { expansion: 'collapsed', feed: 'activity' };

        const port = createFakePort();
        // @ts-ignore - fake port
        await ntpMessaging.onMessage({ ...requestMessage('widgets_setConfig', widgetConfigs), Id: undefined }, port);
        // @ts-ignore - fake port
        await ntpMessaging.onMessage({ ...requestMessage('protections_setConfig', protectionsConfig), Id: undefined }, port);

        // notifications never get a response
        expect(port.posted).toEqual([]);

        expect((await ntpMessaging.handleRequest('initialSetup')).widgetConfigs).toEqual(widgetConfigs);
        expect(await ntpMessaging.handleRequest('protections_getConfig')).toEqual(protectionsConfig);
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
