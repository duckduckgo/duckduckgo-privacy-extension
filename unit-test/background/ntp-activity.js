import browser from 'webextension-polyfill';
import NTPActivity from '../../shared/js/background/components/ntp-activity';
import { emitter, TrackerBlockedEvent } from '../../shared/js/background/before-request';

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
     * @param {string} companyDisplayName
     * @param {string} [pageUrl]
     */
    function blocked(companyDisplayName, pageUrl) {
        emitter.emit(TrackerBlockedEvent.eventName, new TrackerBlockedEvent({ companyDisplayName, pageUrl }));
    }

    it('groups the last 7 days of history by domain, most recently visited first', async () => {
        history = [
            { id: '1', url: 'https://www.example.com/a', title: 'A', lastVisitTime: 3 },
            { id: '2', url: 'https://other.example/', title: 'Other', lastVisitTime: 2 },
            { id: '3', url: 'http://example.com/b', title: '', lastVisitTime: 1 },
            { id: '4', url: 'chrome://settings/', title: 'Settings', lastVisitTime: 0 },
        ];

        const sites = await activity.getSites();

        expect(browser.history.search).toHaveBeenCalledOnceWith({ text: '', startTime: (today - 7) * DAY, maxResults: 0 });
        expect([...sites.keys()]).toEqual(['example.com', 'other.example']);
        expect(sites.get('example.com')).toEqual({
            pages: [
                { url: 'https://www.example.com/a', title: 'A', lastVisitTime: 3 },
                { url: 'http://example.com/b', title: '', lastVisitTime: 1 },
            ],
            trackersBlocked: 0,
            companies: [],
        });
    });

    it('counts the trackers blocked on each domain', async () => {
        history = [
            { id: '1', url: 'https://www.example.com/a', title: 'A', lastVisitTime: 2 },
            { id: '2', url: 'https://other.example/', title: 'Other', lastVisitTime: 1 },
        ];
        const changes = [];
        activity.addEventListener('change', (event) => changes.push(/** @type {CustomEvent} */ (event).detail));

        blocked('Google', 'https://www.example.com/a');
        blocked('Facebook', 'http://example.com/b');
        // not attributable to a page
        blocked('Google');
        blocked('Google', 'about:blank');
        await activity.flushBlocked();
        blocked('Google', 'https://example.com/');
        await activity.flushBlocked();

        const sites = await activity.getSites();
        expect(sites.get('example.com')).toEqual(jasmine.objectContaining({ trackersBlocked: 3, companies: ['Google', 'Facebook'] }));
        expect(sites.get('other.example')).toEqual(jasmine.objectContaining({ trackersBlocked: 0, companies: [] }));
        expect(changes).toEqual([['example.com'], ['example.com']]);
    });

    it('counts the last 7 days, and forgets the domains no longer in the history', async () => {
        history = [{ id: '1', url: 'https://example.com/', title: 'Example', lastVisitTime: 1 }];
        await activity.blocked.bulkPut([
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
        expect(await activity.blocked.where('domain').equals('gone.example').count()).toBe(0);
    });

    it('removes a domain from the history and forgets its blocked trackers', async () => {
        const deleteUrl = spyOn(browser.history, 'deleteUrl').and.returnValue(Promise.resolve());
        history = [
            { id: '1', url: 'https://www.example.com/a', title: 'A', lastVisitTime: 2 },
            { id: '2', url: 'https://example.com/b', title: 'B', lastVisitTime: 1 },
            { id: '3', url: 'https://other.example/', title: 'Other', lastVisitTime: 0 },
        ];
        await activity.blocked.bulkPut([
            { domain: 'example.com', day: today - 20, count: 1, companies: [] },
            { domain: 'other.example', day: today, count: 1, companies: [] },
        ]);

        await activity.removeDomain('example.com');

        expect(deleteUrl.calls.allArgs()).toEqual([[{ url: 'https://www.example.com/a' }], [{ url: 'https://example.com/b' }]]);
        expect(await activity.blocked.toArray()).toEqual([jasmine.objectContaining({ domain: 'other.example' })]);
    });

    it('clears its blocked trackers, including those not yet written', async () => {
        blocked('Google', 'https://example.com/');
        await activity.blocked.put({ domain: 'example.com', day: today, count: 1, companies: [] });

        await activity.clear();
        await activity.flushBlocked();

        expect(await activity.blocked.count()).toBe(0);
    });
});
