import { normalizeBlockedSite, parseBlockedSitesInput } from '../../shared/js/shared-utils/blocked-sites';

describe('blocked sites parsing', () => {
    it('normalizes domains and HTTP URLs', () => {
        expect(normalizeBlockedSite(' Example.COM ')).toBe('example.com');
        expect(normalizeBlockedSite('https://news.example.com/path?q=1')).toBe('news.example.com');
        expect(normalizeBlockedSite('example.com:8443/path')).toBe('example.com');
        expect(normalizeBlockedSite('https://münich.example')).toBe('xn--mnich-kva.example');
    });

    it('rejects unsafe and malformed entries', () => {
        expect(normalizeBlockedSite('')).toBeNull();
        expect(normalizeBlockedSite('*.example.com')).toBeNull();
        expect(normalizeBlockedSite('ftp://example.com')).toBeNull();
        expect(normalizeBlockedSite('https://user:password@example.com')).toBeNull();
        expect(normalizeBlockedSite('not a domain')).toBeNull();
    });

    it('parses, deduplicates, and sorts newline-separated input', () => {
        expect(
            parseBlockedSitesInput(`
                z.example
                https://a.example/path
                Z.EXAMPLE
            `),
        ).toEqual({
            domains: ['a.example', 'z.example'],
            invalidLines: [],
        });
    });

    it('returns invalid lines without dropping valid domains', () => {
        expect(
            parseBlockedSitesInput(`
                example.com
                *.invalid.example
                ftp://invalid.example
            `),
        ).toEqual({
            domains: ['example.com'],
            invalidLines: ['*.invalid.example', 'ftp://invalid.example'],
        });
    });
});
