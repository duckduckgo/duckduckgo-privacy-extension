import { createBundledSiteRankLookup } from '../../shared/js/background/components/cpm-site-rank';

describe('CPM site rank lookup', () => {
    const siteRankLookup = createBundledSiteRankLookup();

    it('matches known top sites and their subdomains', () => {
        expect(siteRankLookup('https://google.com/')).toBe('top');
        expect(siteRankLookup('https://www.google.com/search?q=test')).toBe('top');
        expect(siteRankLookup('https://m.youtube.com/watch')).toBe('top');
        expect(siteRankLookup('https://en.wikipedia.org/wiki/Main_Page')).toBe('top');
    });

    it('gives other for unknown, invalid and blank URLs', () => {
        expect(siteRankLookup('https://www.a8f3k2j9x7q1.example/')).toBe('other');
        expect(siteRankLookup('about:blank')).toBe('other');
        expect(siteRankLookup('not a url')).toBe('other');
        expect(siteRankLookup('')).toBe('other');
        expect(siteRankLookup('http://192.168.1.1/')).toBe('other');
    });

    it('has a false match rate close to 0.1% on random domains', () => {
        // fixed seed pseudo-random generator (mulberry32), so the result does not change between runs
        let seed = 42;
        const random = () => {
            seed = (seed + 0x6d2b79f5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const samples = 200000;
        let matches = 0;
        for (let i = 0; i < samples; i++) {
            const label = random().toString(36).slice(2, 12);
            if (siteRankLookup(`https://www.${label}.com/`) === 'top') {
                matches++;
            }
        }
        const rate = matches / samples;
        console.log(`CPM site rank false match rate: ${rate} (${matches}/${samples})`);
        expect(rate).toBeGreaterThan(0.0003);
        expect(rate).toBeLessThan(0.002);
    });
});
