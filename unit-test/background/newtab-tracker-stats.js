const { NewTabTrackerStats } = require('../../shared/js/background/newtab-tracker-stats');
const settings = require('../../shared/js/background/settings');
const { TrackerStats } = require('../../shared/js/background/classes/tracker-stats');
const constants = require('../../shared/data/constants');
const testTDS = require('../data/tds.json');
const { dataFormatSchema } = require('../../shared/js/newtab/schema');

const SEC = 1000;
const MIN = SEC * 60;
const HOUR = MIN * 60;

describe('NewTabTrackerStats', () => {
    it('produces a filtered output for multiple companies', () => {
        const stats = new TrackerStats();
        const newtab = new NewTabTrackerStats(stats);
        // @ts-ignore
        newtab.assignTopCompanies(testTDS.entities);

        const now = Date.now();

        newtab.record('Google', now);
        newtab.record('Google', now);
        newtab.record('Google', now);
        newtab.record('Facebook', now + MIN * 2);

        // produce the data as consumers would
        const output = newtab.toDisplayData(now);

        // this will throw (and cause the test to fail) if the
        // data has deviated from the schema defined here
        dataFormatSchema.parse(output);

        // just some manual checks on the values too
        expect(output.totalCount).toEqual(4);
        expect(output.trackerCompanies.length).toEqual(2);
    });
    it('only lists the names of entries in the top 100 list', () => {
        const stats = new TrackerStats();
        const newtab = new NewTabTrackerStats(stats);
        // @ts-ignore
        newtab.assignTopCompanies(testTDS.entities);

        const now = Date.now();

        newtab.record('Google', now);
        newtab.record('A', now);
        newtab.record('B', now);

        // produce the data as consumers would
        const output = newtab.toDisplayData(now);
        dataFormatSchema.parse(output);

        expect(output.totalCount).toEqual(3);

        // The `A` and `B` should be grouped into the `Other` category
        expect(output.trackerCompanies).toEqual([
            {
                displayName: 'Google',
                count: 1,
            },
            {
                displayName: 'Other',
                count: 2,
            },
        ]);
    });
    it('combines none-top entries', () => {
        const stats = new TrackerStats();
        const newtab = new NewTabTrackerStats(stats);

        // @ts-ignore
        newtab.assignTopCompanies(testTDS.entities, 5);

        const now = Date.now();
        const top10 = Object.keys(testTDS.entities)
            .slice(0, 5)
            .map((key) => testTDS.entities[key].displayName);

        for (const displayName of top10) {
            newtab.record(displayName, now);
        }

        // not in the top 100
        newtab.record('A', now);
        newtab.record('B', now);

        // produce the data as consumers would
        const output = newtab.toDisplayData(now);
        dataFormatSchema.parse(output);

        // The `A` and `B` should be grouped into the `Other` category
        expect(output).toEqual({
            atb: undefined,
            totalCount: 7,
            totalPeriod: 'install-time',
            trackerCompaniesPeriod: 'last-day',
            trackerCompanies: [
                {
                    displayName: 'Facebook',
                    count: 1,
                },
                {
                    displayName: 'Google',
                    count: 1,
                },
                {
                    displayName: 'Microsoft',
                    count: 1,
                },
                {
                    displayName: 'Xandr',
                    count: 1,
                },
                {
                    displayName: 'Other',
                    count: 3,
                },
            ],
        });
    });
});

describe('sending data', () => {
    beforeEach(() => {
        jasmine.clock().install();
        // @ts-ignore
        while (chrome.storage.local._setCalls.length > 0) {
            // @ts-ignore
            chrome.storage.local._setCalls.pop();
        }
    });
    afterEach(() => {
        jasmine.clock().uninstall();
    });
    it('should debounce sending data after recording tracker events', () => {
        const stats = new TrackerStats();
        const newtab = new NewTabTrackerStats(stats);

        // @ts-ignore
        newtab.assignTopCompanies(testTDS.entities);
        const sendSpy = spyOn(newtab, '_publish');
        // @ts-ignore
        const syncSpy = chrome.storage.local._setCalls;

        const now = 1673473220560;

        newtab.record('Google', now);
        newtab.record('Google', now);
        newtab.record('Google', now);
        newtab.record('Google', now);
        newtab.record('Google', now);
        newtab.record('Google', now);

        // 1000 ms for the 'record' debounce
        // 200 ms for the send debounce.
        // so, 5000 gives plenty of time to catch any unwanted called
        jasmine.clock().tick(5000);
        expect(sendSpy).toHaveBeenCalledTimes(1);

        // assert that values were synced to storage
        expect(syncSpy.length).toBe(1);
        expect(syncSpy[0]).toEqual({
            [NewTabTrackerStats.storageKey]: {
                stats: {
                    current: {
                        start: now,
                        end: 0,
                        entries: {
                            Google: 6,
                        },
                    },
                    packs: [],
                    totalCount: 6,
                    entries: null,
                },
            },
        });
    });
});

describe('incoming events', () => {
    let newtab, sendSpy;
    beforeEach(() => {
        const stats = new TrackerStats();
        const now = 1673473220560;
        stats.deserialize({
            current: {
                start: now,
                end: 0,
                entries: {
                    Google: 6,
                },
            },
            packs: [],
            totalCount: 6,
        });

        newtab = new NewTabTrackerStats(stats);
        sendSpy = spyOn(newtab, '_publish');
        jasmine.clock().install();
    });
    afterEach(() => {
        jasmine.clock().uninstall();
    });
    it('should respond to heartbeat', () => {
        // simulate a valid incoming event
        newtab._handleIncomingEvent({
            messageType: constants.trackerStats.events.incoming.newTabPage_heartbeat,
        });

        // allow for the debouncing on send
        jasmine.clock().tick(201);
        expect(sendSpy).toHaveBeenCalledTimes(1);
    });
});

describe('alarms', () => {
    let newtab, sendSpy;
    const now = 1673473220560;
    const oneHourAgo = now - HOUR;
    const twoHourAgo = now - HOUR * 2;
    beforeEach(() => {
        const stats = new TrackerStats();
        stats.deserialize({
            current: {
                start: 0,
                end: 0,
                entries: {},
            },
            packs: [
                {
                    start: twoHourAgo,
                    end: oneHourAgo,
                    entries: {
                        Google: 6,
                    },
                },
            ],
            totalCount: 6,
        });
        spyOn(settings, 'getSetting').and.returnValue('v374');
        newtab = new NewTabTrackerStats(stats);
        sendSpy = spyOn(newtab, '_publish');
        jasmine.clock().install();
    });
    afterEach(() => {
        jasmine.clock().uninstall();
    });
    it('should evict expired entries', () => {
        const callTime = now + MIN * 61;

        // simulate calling evictExpired at a time that would evict all entries (61 min in this case)
        newtab._handlePruneAlarm(callTime);

        // allow for the debouncing on send
        jasmine.clock().tick(201);
        expect(sendSpy).toHaveBeenCalledTimes(1);

        const display = newtab.toDisplayData(10, callTime);
        expect(display).toEqual({
            atb: 'v374',
            totalCount: 6,
            totalPeriod: 'install-time',
            trackerCompaniesPeriod: 'last-day',
            trackerCompanies: [],
        });
    });
});

describe('CSP for new tab page', () => {
    it('should contain a valid CSP entry for MV3', () => {
        const mv3 = require('../../browsers/chrome/manifest.json');
        expect(mv3.content_security_policy.extension_pages).toBe(
            "script-src 'self'; object-src 'self'; frame-ancestors https://duckduckgo.com https://*.duckduckgo.com",
        );
    });
});
