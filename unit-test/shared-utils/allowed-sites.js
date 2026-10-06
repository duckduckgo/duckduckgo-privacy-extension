import {
    allowedPatternMatchesHostname,
    findAllowedConflict,
    findOverlappingAllowedPatterns,
    isTooBroadAllowedPattern,
    matchingAllowedPattern,
    normalizeAllowedPattern,
    overlapsGroupDomain,
    parseAllowedSitesInput,
    requestDomainForAllowedPattern,
    dnrRegexForAllowedPattern,
} from '../../shared/js/shared-utils/allowed-sites';

describe('allowed sites helpers', () => {
    const social = {
        id: 'social',
        name: 'Social',
        maxSecondsPerDay: 600,
        domains: ['youtube.com', 'reddit.com'],
    };

    it('normalizes hostnames and HTTP URLs', () => {
        expect(normalizeAllowedPattern(' Example.COM ')).toEqual({ pattern: 'example.com', reason: null });
        expect(normalizeAllowedPattern('https://docs.example.com/path?q=1')).toEqual({
            pattern: 'docs.example.com',
            reason: null,
        });
        expect(normalizeAllowedPattern('https://*.youtube.com/watch')).toEqual({
            pattern: '*.youtube.com',
            reason: null,
        });
    });

    it('accepts globs and rejects a lone star or public suffixes', () => {
        expect(normalizeAllowedPattern('*.youtube.com')).toEqual({ pattern: '*.youtube.com', reason: null });
        expect(normalizeAllowedPattern('*docs*')).toEqual({ pattern: '*docs*', reason: null });
        expect(normalizeAllowedPattern('*foo')).toEqual({ pattern: '*foo', reason: null });
        expect(normalizeAllowedPattern('*.edu')).toEqual({ pattern: '*.edu', reason: null });
        expect(normalizeAllowedPattern('*')).toEqual({ pattern: null, reason: 'tooBroad' });
        expect(normalizeAllowedPattern('*.com')).toEqual({ pattern: null, reason: 'tooBroad' });
        expect(normalizeAllowedPattern('*.co.uk')).toEqual({ pattern: null, reason: 'tooBroad' });
        expect(normalizeAllowedPattern('*.github.io')).toEqual({ pattern: null, reason: 'tooBroad' });
        expect(normalizeAllowedPattern('com')).toEqual({ pattern: null, reason: 'tooBroad' });
        expect(isTooBroadAllowedPattern('*.com')).toBeTrue();
        expect(isTooBroadAllowedPattern('*.edu')).toBeFalse();
        expect(isTooBroadAllowedPattern('*.youtube.com')).toBeFalse();
    });

    it('rejects malformed globs', () => {
        expect(normalizeAllowedPattern('*.youtube.com/')).toEqual({ pattern: '*.youtube.com', reason: null });
        expect(normalizeAllowedPattern('not a domain')).toEqual({ pattern: null, reason: 'invalid' });
        expect(normalizeAllowedPattern('ftp://*.youtube.com')).toEqual({ pattern: null, reason: 'invalid' });
    });

    it('matches apex hosts for *.domain globs', () => {
        expect(allowedPatternMatchesHostname('*.youtube.com', 'youtube.com')).toBeTrue();
        expect(allowedPatternMatchesHostname('*.youtube.com', 'music.youtube.com')).toBeTrue();
        expect(allowedPatternMatchesHostname('*.youtube.com', 'google.com')).toBeFalse();
        expect(allowedPatternMatchesHostname('*docs*', 'docs.google.com')).toBeTrue();
        expect(allowedPatternMatchesHostname('*.edu', 'harvard.edu')).toBeTrue();
        expect(allowedPatternMatchesHostname('*.edu', 'www.mit.edu')).toBeTrue();
        expect(allowedPatternMatchesHostname('*.edu', 'harvard.com')).toBeFalse();
    });

    it('treats grouped hosts and allowed globs as overlapping both ways', () => {
        expect(overlapsGroupDomain('youtube.com', 'www.youtube.com')).toBeTrue();
        expect(overlapsGroupDomain('www.youtube.com', 'youtube.com')).toBeTrue();
        expect(overlapsGroupDomain('*.youtube.com', 'youtube.com')).toBeTrue();
        expect(overlapsGroupDomain('*tube*', 'youtube.com')).toBeTrue();
        expect(overlapsGroupDomain('*.google.com', 'youtube.com')).toBeFalse();
        expect(findOverlappingAllowedPatterns(['*.youtube.com', 'khanacademy.org'], 'music.youtube.com')).toEqual(['*.youtube.com']);
        expect(findAllowedConflict('*.youtube.com', [social])).toEqual({
            groupId: 'social',
            groupName: 'Social',
            domain: 'youtube.com',
        });
        expect(findAllowedConflict('khanacademy.org', [social])).toBeNull();
    });

    it('uses requestDomains for hosts and *.example.com, but regex for *.edu', () => {
        expect(requestDomainForAllowedPattern('khanacademy.org')).toBe('khanacademy.org');
        expect(requestDomainForAllowedPattern('*.youtube.com')).toBe('youtube.com');
        expect(requestDomainForAllowedPattern('*.edu')).toBeNull();
        expect(requestDomainForAllowedPattern('*docs*')).toBeNull();
        expect(dnrRegexForAllowedPattern('khanacademy.org')).toBeNull();
        expect(dnrRegexForAllowedPattern('*.youtube.com')).toBeNull();
        expect(dnrRegexForAllowedPattern('*.edu')).toBe('^https?://([^/?#:@]*@)?[^/?#]*\\.edu(:[0-9]+)?([/?#]|$)');
        expect(dnrRegexForAllowedPattern('*docs*')).toBe('^https?://([^/?#:@]*@)?[^/?#]*docs[^/?#]*(:[0-9]+)?([/?#]|$)');
    });

    it('picks the most specific allowed pattern for a hostname', () => {
        expect(matchingAllowedPattern('www.wikipedia.org', ['wikipedia.org', '*.edu'])).toBe('wikipedia.org');
        expect(matchingAllowedPattern('en.wikipedia.org', ['*.wikipedia.org', 'wikipedia.org'])).toBe('wikipedia.org');
        expect(matchingAllowedPattern('news.example.com', ['example.com', 'news.example.com'])).toBe('news.example.com');
        expect(matchingAllowedPattern('example.com', ['*.edu'])).toBeNull();
    });

    it('parses newline input and keeps rejected lines', () => {
        expect(
            parseAllowedSitesInput(`
                khanacademy.org
                *.com
                *.youtube.com
                not a domain
            `),
        ).toEqual({
            patterns: ['khanacademy.org', '*.youtube.com'],
            rejected: [
                { line: '*.com', reason: 'tooBroad' },
                { line: 'not a domain', reason: 'invalid' },
            ],
        });
    });
});
