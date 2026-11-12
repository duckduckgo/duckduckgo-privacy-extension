import browser from 'webextension-polyfill';
import NTPActivity, { pageDomain } from '../../shared/js/background/components/ntp-activity';
import { emitter, TrackerFoundEvent } from '../../shared/js/background/before-request';

describe('NTPActivity component', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const today = Math.floor(Date.now() / DAY);

    /** @type {NTPActivity} */
    let activity;
    /** @type {import('webextension-polyfill').History.HistoryItem[]} */
    let history;
    let dbCount = 0;

    beforeEach(() => {
        history = [];
        spyOn(browser.history, 'search').and.callFake(async () => history);
        // A database per test: instances left listening on the shared emitter only write to their own.
        activity = new NTPActivity(`ntpActivityTest${dbCount++}`);
    });

    /**
     * @param {string} pageUrl
     * @param {string} companyDisplayName
     * @param {boolean} [blocked]
     */
    function found(pageUrl, companyDisplayName, blocked = true) {
        emitter.emit(TrackerFoundEvent.eventName, new TrackerFoundEvent({ pageUrl, companyDisplayName, blocked }));
    }

    it('groups the last 7 days of history by domain, most recently visited first', async () => {
        history = [
            { id: '1', url: 'https://www.example.com/a', title: 'A', lastVisitTime: 3 },
            { id: '2', url: 'https://other.example/', title: 'Other', lastVisitTime: 2 },
            { id: '3', url: 'http://example.com/b', title: '', lastVisitTime: 1 },
            { id: '4', url: 'chrome://settings/', title: 'Settings', lastVisitTime: 0 },
        ];

        const sites = await activity.getSites();

        expect(browser.history.search).toHaveBeenCalledOnceWith({ text: '', startTime: (today - 7) * DAY, maxResults: 5000 });
        expect([...sites.keys()]).toEqual(['example.com', 'other.example']);
        expect(sites.get('example.com')).toEqual({
            pages: [
                { url: 'https://www.example.com/a', title: 'A', lastVisitTime: 3 },
                { url: 'http://example.com/b', title: '', lastVisitTime: 1 },
            ],
            trackersFound: false,
            trackersBlocked: 0,
            companies: [],
        });
    });

    it('groups pages by their host without a leading www.', () => {
        const urls = ['https://www.example.com/a', 'http://example.com:8080/', 'https://www.www.example.com/', 'http://[::1]:3000/'];
        expect(urls.map(pageDomain)).toEqual(['example.com', 'example.com', 'www.example.com', '[::1]']);
        expect(['chrome://settings/', 'about:blank', 'https://', ''].map(pageDomain)).toEqual(['', '', '', '']);
    });

    it('counts the trackers found and blocked on each domain', async () => {
        history = [
            { id: '1', url: 'https://www.example.com/a', title: 'A', lastVisitTime: 3 },
            { id: '2', url: 'https://allowed.example/', title: 'Allowed', lastVisitTime: 2 },
            { id: '3', url: 'https://other.example/', title: 'Other', lastVisitTime: 1 },
        ];
        const changes = [];
        activity.addEventListener('change', (event) => changes.push(/** @type {CustomEvent} */ (event).detail));

        found('https://www.example.com/a', 'Google');
        found('http://example.com/b', 'Facebook');
        found('https://allowed.example/', 'Google', false);
        // not a web page
        found('about:blank', 'Google');
        await activity.flushTrackers();
        found('https://example.com/', 'Google');
        await activity.flushTrackers();

        const sites = await activity.getSites();
        expect(sites.get('example.com')).toEqual(
            jasmine.objectContaining({ trackersFound: true, trackersBlocked: 3, companies: ['Google', 'Facebook'] }),
        );
        expect(sites.get('allowed.example')).toEqual(jasmine.objectContaining({ trackersFound: true, trackersBlocked: 0, companies: [] }));
        expect(sites.get('other.example')).toEqual(jasmine.objectContaining({ trackersFound: false, trackersBlocked: 0 }));
        expect(changes).toEqual([['example.com', 'allowed.example'], ['example.com']]);
    });

    it('counts the last 7 days of the domains in the history', async () => {
        history = [{ id: '1', url: 'https://example.com/', title: 'Example', lastVisitTime: 1 }];
        await activity.trackersPerSite.bulkPut([
            { domain: 'example.com', day: today, count: 1, companies: ['Google'] },
            { domain: 'example.com', day: today - 7, count: 2, companies: ['Facebook'] },
            { domain: 'example.com', day: today - 8, count: 4, companies: ['Amazon'] },
            { domain: 'gone.example', day: today, count: 8, companies: ['Google'] },
        ]);

        const sites = await activity.getSites();

        expect(sites.get('example.com')).toEqual(
            jasmine.objectContaining({ trackersBlocked: 3, companies: jasmine.arrayWithExactContents(['Google', 'Facebook']) }),
        );
        expect(sites.has('gone.example')).toBeFalse();
        expect(await activity.trackersPerSite.count()).toBe(4);
    });

    it('prunes the trackers from before the last 7 days, and of the domains no longer in the history', async () => {
        history = [{ id: '1', url: 'https://example.com/', title: 'Example', lastVisitTime: 1 }];
        await activity.trackersPerSite.bulkPut([
            { domain: 'example.com', day: today, count: 1, companies: [] },
            { domain: 'example.com', day: today - 7, count: 1, companies: [] },
            { domain: 'example.com', day: today - 8, count: 1, companies: [] },
            { domain: 'gone.example', day: today, count: 1, companies: [] },
        ]);

        await activity.pruneTrackers();

        expect((await activity.trackersPerSite.toArray()).map(({ domain, day }) => [domain, today - day])).toEqual([
            ['example.com', 7],
            ['example.com', 0],
        ]);
    });

    it('removes a domain from the history and forgets its trackers', async () => {
        const deleteUrl = spyOn(browser.history, 'deleteUrl').and.returnValue(Promise.resolve());
        history = [
            { id: '1', url: 'https://www.example.com/a', title: 'A', lastVisitTime: 2 },
            { id: '2', url: 'https://example.com/b', title: 'B', lastVisitTime: 1 },
            { id: '3', url: 'https://other.example/', title: 'Other', lastVisitTime: 0 },
        ];
        await activity.trackersPerSite.bulkPut([
            { domain: 'example.com', day: today - 20, count: 1, companies: [] },
            { domain: 'other.example', day: today, count: 1, companies: [] },
        ]);

        await activity.removeDomain('example.com');

        expect(deleteUrl.calls.allArgs()).toEqual([[{ url: 'https://www.example.com/a' }], [{ url: 'https://example.com/b' }]]);
        expect(await activity.trackersPerSite.toArray()).toEqual([jasmine.objectContaining({ domain: 'other.example' })]);
    });

    it('logs when the browser has no burn event to clear it on', () => {
        const consoleError = spyOn(console, 'error');
        new NTPActivity(`ntpActivityTest${dbCount++}`); // eslint-disable-line no-new
        expect(consoleError).toHaveBeenCalledOnceWith(jasmine.stringContaining('chrome.ddg.onBurnStarted is unavailable'));
    });

    it('clears its trackers, including those not yet written', async () => {
        found('https://example.com/', 'Google');
        await activity.trackersPerSite.put({ domain: 'example.com', day: today, count: 1, companies: [] });

        await activity.clear();
        await activity.flushTrackers();

        expect(await activity.trackersPerSite.count()).toBe(0);
    });
});
