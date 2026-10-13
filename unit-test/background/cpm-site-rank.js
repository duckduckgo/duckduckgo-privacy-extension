import { createSiteRankLookup, encodeTopSites, fnv1a32 } from '../../shared/js/background/components/cpm-site-rank';

// fixed seed pseudo-random generator (mulberry32), so the results do not change between runs
function seededRandom(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function randomDomains(random, count) {
    return Array.from({ length: count }, () => `${random().toString(36).slice(2, 12)}.com`);
}

describe('CPM site rank lookup', () => {
    const siteRankLookup = createSiteRankLookup(encodeTopSites(['google.com', 'youtube.com', 'wikipedia.org', 'bbc.co.uk', 'www.gov.uk']));

    // Test vectors for ports of the lookup; keep them in sync with docs/cpm-site-rank.md
    it('hashes with 32-bit FNV-1a', () => {
        expect(fnv1a32('')).toBe(0x811c9dc5);
        expect(fnv1a32('a')).toBe(0xe40c292c);
        expect(fnv1a32('foobar')).toBe(0xbf9cf968);
        expect(fnv1a32('example.com')).toBe(0x431ceb26);
        expect(fnv1a32('www.example.com')).toBe(0x88469fcb);
        expect(fnv1a32('bbc.co.uk')).toBe(0xe55ec88c);
        expect(fnv1a32('xn--bcher-kva.de')).toBe(0x0d16ee2d);
    });

    it('matches internationalized hostnames by their punycode form', () => {
        const lookup = createSiteRankLookup(encodeTopSites(['xn--bcher-kva.de']));
        expect(lookup('https://www.bücher.de/')).toBe('top10k');
        expect(lookup('https://www.xn--bcher-kva.de/')).toBe('top10k');
        expect(lookup('https://www.bucher.de/')).toBe('other');
    });

    it('matches top sites and their subdomains', () => {
        expect(siteRankLookup('https://google.com/')).toBe('top10k');
        expect(siteRankLookup('https://www.google.com/search?q=test')).toBe('top10k');
        expect(siteRankLookup('https://WWW.GOOGLE.COM./')).toBe('top10k');
        expect(siteRankLookup('https://m.youtube.com/watch')).toBe('top10k');
        expect(siteRankLookup('https://en.wikipedia.org/wiki/Main_Page')).toBe('top10k');
        expect(siteRankLookup('https://www.bbc.co.uk/news')).toBe('top10k');
        expect(siteRankLookup('https://www.gov.uk/')).toBe('top10k');
        expect(siteRankLookup('https://assets.www.gov.uk/')).toBe('top10k');
    });

    it('gives other for other sites, public suffixes, invalid and blank URLs', () => {
        expect(siteRankLookup('https://notgoogle.com/')).toBe('other');
        expect(siteRankLookup('https://google.com.example.net/')).toBe('other');
        expect(siteRankLookup('https://co.uk/')).toBe('other');
        expect(siteRankLookup('https://gov.uk/')).toBe('other');
        expect(siteRankLookup('http://localhost/')).toBe('other');
        expect(siteRankLookup('http://192.168.1.1/')).toBe('other');
        expect(siteRankLookup('http://[::1]/')).toBe('other');
        expect(siteRankLookup('about:blank')).toBe('other');
        expect(siteRankLookup('not a url')).toBe('other');
        expect(siteRankLookup('')).toBe('other');
    });

    it('gives no lookup without top site data', () => {
        expect(createSiteRankLookup(encodeTopSites([]))).toBeUndefined();
    });

    it('gives no lookup for malformed top site data', () => {
        const { count, data } = encodeTopSites(['google.com', 'youtube.com', 'wikipedia.org']);
        expect(createSiteRankLookup({ count: count + 1, data })).toBeUndefined();
        expect(createSiteRankLookup({ count: count - 1, data })).toBeUndefined();
        expect(createSiteRankLookup({ count, data: data.slice(0, -4) })).toBeUndefined();
        expect(createSiteRankLookup({ count, data: '!not base64!' })).toBeUndefined();
        expect(createSiteRankLookup({ count: -1, data })).toBeUndefined();
    });

    it('matches every top site and almost nothing else in a list of 10k', () => {
        const random = seededRandom(42);
        const members = randomDomains(random, 10000);
        const lookup = createSiteRankLookup(encodeTopSites(members));
        expect(members.every((domain) => lookup(`https://www.${domain}/`) === 'top10k')).toBeTrue();

        // each lookup checks two suffixes against 10k hashes, so about 1 false match is expected in 200k
        const samples = 200000;
        let matches = 0;
        for (const domain of randomDomains(random, samples)) {
            if (lookup(`https://www.${domain}/`) === 'top10k') {
                matches++;
            }
        }
        expect(matches).toBeLessThan(5);
    });
});
