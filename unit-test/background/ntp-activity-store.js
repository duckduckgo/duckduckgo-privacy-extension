import { NTPActivityStore, RETENTION_MS, MAX_SITES, MAX_HISTORY_ENTRIES } from '../../shared/js/background/classes/ntp-activity-store';

describe('NTPActivityStore', () => {
    /** @type {NTPActivityStore} */
    let store;
    let dbCounter = 0;

    const HOUR = 60 * 60 * 1000;

    beforeEach(() => {
        store = new NTPActivityStore(`ntpActivityTest-${Date.now()}-${dbCounter++}`);
    });

    afterEach(async () => {
        await store.db.delete();
    });

    it('records visits, newest first, deduplicating repeat visits to the same page', async () => {
        const now = Date.now();
        await store.recordVisit({ host: 'example.com', etldPlusOne: 'example.com', url: 'https://example.com/a', timestamp: now });
        await store.recordVisit({
            host: 'example.com',
            etldPlusOne: 'example.com',
            url: 'https://example.com/b',
            title: 'Page B',
            timestamp: now + 1000,
        });
        // repeat visit to /b: refreshes the entry rather than duplicating it
        await store.recordVisit({ host: 'example.com', etldPlusOne: 'example.com', url: 'https://example.com/b', timestamp: now + 2000 });

        const row = await store.get('example.com');
        expect(row?.lastVisit).toBe(now + 2000);
        expect(row?.history).toEqual([
            { title: 'Page B', url: 'https://example.com/b', visitedAt: now + 2000 },
            // no title known yet: falls back to the url
            { title: 'https://example.com/a', url: 'https://example.com/a', visitedAt: now },
        ]);
    });

    it('caps the number of history entries per site', async () => {
        const now = Date.now();
        for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
            await store.recordVisit({
                host: 'example.com',
                etldPlusOne: 'example.com',
                url: `https://example.com/${i}`,
                timestamp: now + i,
            });
        }
        const row = await store.get('example.com');
        expect(row?.history.length).toBe(MAX_HISTORY_ENTRIES);
        expect(row?.history[0].url).toBe(`https://example.com/${MAX_HISTORY_ENTRIES + 4}`);
    });

    it('updates the title of a recorded visit', async () => {
        await store.recordVisit({ host: 'example.com', etldPlusOne: 'example.com', url: 'https://example.com/a' });

        expect(await store.updateTitle('example.com', 'https://example.com/a', 'Page A')).toBe(true);
        expect(await store.updateTitle('example.com', 'https://example.com/missing', 'Nope')).toBe(false);
        expect(await store.updateTitle('other.com', 'https://other.com/', 'Nope')).toBe(false);

        const row = await store.get('example.com');
        expect(row?.history[0].title).toBe('Page A');
    });

    it('accumulates blocked tracker counts per company, creating the row if needed', async () => {
        await store.recordBlockedTrackers({ host: 'example.com', etldPlusOne: 'example.com' }, { Google: 2, Facebook: 1 });
        await store.recordBlockedTrackers({ host: 'example.com', etldPlusOne: 'example.com' }, { Google: 3 });

        const row = await store.get('example.com');
        expect(row?.totalCount).toBe(6);
        expect(row?.companies).toEqual({ Google: 5, Facebook: 1 });
        expect(row?.url).toBe('https://example.com/');
    });

    it('lists sites by recency and resolves them by url', async () => {
        const now = Date.now();
        await store.recordVisit({
            host: 'old.example.com',
            etldPlusOne: 'example.com',
            url: 'https://old.example.com/',
            timestamp: now - HOUR,
        });
        await store.recordVisit({ host: 'new.example.com', etldPlusOne: 'example.com', url: 'https://new.example.com/', timestamp: now });

        const rows = await store.getAll();
        expect(rows.map((r) => r.host)).toEqual(['new.example.com', 'old.example.com']);

        const forUrls = await store.getForUrls(['https://old.example.com/', 'https://missing.com/', 'not a url']);
        expect(forUrls.map((r) => r.host)).toEqual(['old.example.com']);
    });

    it('removes a site by url', async () => {
        await store.recordVisit({ host: 'example.com', etldPlusOne: 'example.com', url: 'https://example.com/' });

        expect(await store.removeByUrl('https://example.com/')).toBe(true);
        expect(await store.removeByUrl('https://example.com/')).toBe(false);
        expect(await store.get('example.com')).toBeUndefined();
    });

    it('prunes sites past the retention window and enforces the site cap', async () => {
        const now = Date.now();
        await store.recordVisit({
            host: 'stale.com',
            etldPlusOne: 'stale.com',
            url: 'https://stale.com/',
            timestamp: now - RETENTION_MS - HOUR,
        });
        for (let i = 0; i < MAX_SITES + 3; i++) {
            await store.recordVisit({
                host: `site-${i}.com`,
                etldPlusOne: `site-${i}.com`,
                url: `https://site-${i}.com/`,
                timestamp: now - i,
            });
        }

        await store.prune(now);

        expect(await store.get('stale.com')).toBeUndefined();
        expect(await store.sites.count()).toBe(MAX_SITES);
        // the oldest of the fresh rows were dropped to enforce the cap
        expect(await store.get(`site-${MAX_SITES + 2}.com`)).toBeUndefined();
        expect(await store.get('site-0.com')).toBeDefined();
    });
});
