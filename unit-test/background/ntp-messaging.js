import NTPMessaging from '../../shared/js/background/components/ntp-messaging';
import { NewTabTrackerStats } from '../../shared/js/background/newtab-tracker-stats';
import { TrackerStats } from '../../shared/js/background/classes/tracker-stats';
import { MockSettings } from '../helpers/mocks';

describe('NTPMessaging component', () => {
    /** @type {NTPMessaging} */
    let ntpMessaging;
    /** @type {MockSettings} */
    let settings;

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
        // @ts-ignore - MockSettings stands in for the settings module
        ntpMessaging = new NTPMessaging({ settings });

        const trackerStats = new TrackerStats();
        NewTabTrackerStats.shared = new NewTabTrackerStats(trackerStats);
    });

    afterEach(() => {
        NewTabTrackerStats.shared = null;
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
        NewTabTrackerStats.shared?.stats.increment('Google', now);
        NewTabTrackerStats.shared?.stats.increment('Google', now);
        NewTabTrackerStats.shared?.stats.increment('Facebook', now);

        const result = await ntpMessaging.handleRequest('protections_getData');
        expect(result).toEqual({ totalCount: 3 });
    });

    it('answers stats_getData with per-company counts, mapping "other" to the NTP identifier and placing it last', async () => {
        const now = Date.now();
        const stats = NewTabTrackerStats.shared?.stats;
        // 'other' has the highest count, but must still be listed last
        for (let i = 0; i < 5; i++) {
            stats?.increment(NewTabTrackerStats.otherCompaniesKey, now);
        }
        stats?.increment('Google', now);
        stats?.increment('Google', now);
        stats?.increment('Facebook', now);

        const result = await ntpMessaging.handleRequest('stats_getData');
        expect(result.trackerCompanies).toEqual([
            { displayName: 'Google', count: 2 },
            { displayName: 'Facebook', count: 1 },
            { displayName: '__other__', count: 5 },
        ]);
    });

    it('returns empty activity data for both plain and batched activity APIs', async () => {
        expect(await ntpMessaging.handleRequest('activity_getData')).toEqual({ activity: [] });
        expect(await ntpMessaging.handleRequest('activity_getUrls')).toEqual({ urls: [], totalTrackersBlocked: 0 });
        expect(await ntpMessaging.handleRequest('activity_getDataForUrls', { urls: [] })).toEqual({ activity: [] });
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

        NewTabTrackerStats.shared?.stats.increment('Google', Date.now());
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
