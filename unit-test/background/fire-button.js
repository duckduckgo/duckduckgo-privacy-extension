import { getOriginsForUrl, tabMatchesHostFilter } from '../../shared/js/background/features/fire-button'

describe('fire button utils', () => {
    describe('tabMatchesOriginFilter', () => {
        const tabs = [{
            url: 'https://example.com/'
        }, {
            url: 'https://example.com/foo'
        }, {
            url: 'http://www.example.com/'
        }, {
            url: 'other://protocol'
        }, {
            url: 'https://duckduckgo.com/'
        }, {
            url: 'https://a.blogspot.com/'
        }, {
            url: 'https://other.blogspot.com/'
        }]

        const testCases = [{
            desc: 'matches example.com tabs, ignoring protocol',
            origins: ['https://example.com'],
            expected: [0, 1, 2]
        }, {
            desc: 'matches against all origins in list',
            origins: ['https://www.duckduckgo.com', 'http://example.com'],
            expected: [0, 1, 2, 4]
        }, {
            desc: 'matches all entries if origins is falsy',
            origins: undefined,
            expected: [0, 1, 2, 3, 4, 5, 6]
        }, {
            desc: 'matches against eTLD+1 of origin',
            origins: ['http://a.b.example.com'],
            expected: [0, 1, 2]
        }, {
            desc: 'uses eTLD+1 including private PSL domains',
            origins: ['https://a.blogspot.com'],
            expected: [5]
        }]

        testCases.forEach(({ desc, origins, expected }) => {
            it(desc, () => {
                expect(tabs.filter(tabMatchesHostFilter(origins))).toEqual(expected.map(ind => tabs[ind]))
            })
        })
    })

    describe('getOriginsForUrl', () => {
        it('returns http and https origins for a URL', () => {
            expect(getOriginsForUrl('https://example.com')).toEqual([
                'https://example.com', 'http://example.com'
            ])
        })

        it('expands out all subdomain origins', () => {
            expect(getOriginsForUrl('https://a.b.example.com')).toEqual([
                'https://example.com', 'http://example.com',
                'https://b.example.com', 'http://b.example.com',
                'https://a.b.example.com', 'http://a.b.example.com'
            ])
        })

        it('expands up to eTLD+1 (with private entries)', () => {
            expect(getOriginsForUrl('https://a.b.blogspot.com')).toEqual([
                'https://b.blogspot.com', 'http://b.blogspot.com',
                'https://a.b.blogspot.com', 'http://a.b.blogspot.com'
            ])
        })
    })
})
