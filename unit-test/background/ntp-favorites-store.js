import { NTPFavoritesStore } from '../../shared/js/background/classes/ntp-favorites-store';

describe('NTPFavoritesStore', () => {
    /** @type {NTPFavoritesStore} */
    let store;

    beforeEach(() => {
        // the chrome shim's storage returns nothing, so each store starts empty
        store = new NTPFavoritesStore();
    });

    it('adds favorites in order, deduplicating by url', async () => {
        expect(await store.add({ url: 'https://a.example/', title: 'A' })).toBe(true);
        expect(await store.add({ url: 'https://b.example/', title: 'B' })).toBe(true);
        expect(await store.add({ url: 'https://a.example/', title: 'A again' })).toBe(false);

        expect(await store.getAll()).toEqual([
            { id: 'https://a.example/', url: 'https://a.example/', title: 'A' },
            { id: 'https://b.example/', url: 'https://b.example/', title: 'B' },
        ]);
        expect(await store.getUrls()).toEqual(new Set(['https://a.example/', 'https://b.example/']));
    });

    it('removes favorites by url', async () => {
        await store.add({ url: 'https://a.example/', title: 'A' });

        expect(await store.remove('https://a.example/')).toBe(true);
        expect(await store.remove('https://a.example/')).toBe(false);
        expect(await store.getAll()).toEqual([]);
    });

    it('moves favorites to a target position, clamping out-of-range targets', async () => {
        await store.add({ url: 'https://a.example/', title: 'A' });
        await store.add({ url: 'https://b.example/', title: 'B' });
        await store.add({ url: 'https://c.example/', title: 'C' });

        expect(await store.move('https://c.example/', 0)).toBe(true);
        expect((await store.getAll()).map((f) => f.title)).toEqual(['C', 'A', 'B']);

        expect(await store.move('https://c.example/', 99)).toBe(true);
        expect((await store.getAll()).map((f) => f.title)).toEqual(['A', 'B', 'C']);

        expect(await store.move('https://missing.example/', 0)).toBe(false);
        // @ts-ignore - bad input from the page
        expect(await store.move('https://a.example/', undefined)).toBe(false);
    });
});
