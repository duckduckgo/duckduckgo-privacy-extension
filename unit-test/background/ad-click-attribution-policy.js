const config = require('../../shared/data/bundled/extension-config.json')

describe('check policy', () => {
    let adClickAttributionPolicy
    beforeEach(async () => {
        const { AdClickAttributionPolicy } = require('../../shared/js/background/classes/ad-click-attribution-policy')
        adClickAttributionPolicy = new AdClickAttributionPolicy()
        // This is not ideal, but it's the only way to get the policy to load the expected data. Stubs aren't working through imports.
        adClickAttributionPolicy.allowlist = config.features.adClickAttribution.settings.allowlist
        expect(adClickAttributionPolicy.allowlist.length).not.toEqual(0)
    })
    it('should return false if url is not expected to match', () => {
        const invalidCases = [
            'https://www.google.com/',
            'https://converters.ad-company.site/',
            'https://convert.ad-company.site.other.com/',
            'https://convert.ad-company.sitething.com/',
            'https://convert.ad-company.site.other.com/path/to/file.html',
            'https://bigconvert.ad-company.site/',
            'https://bigconvert.ad-company.site/path/to/file.html'
        ]
        for (const url of invalidCases) {
            expect(adClickAttributionPolicy.resourcePermitted(url))
                .withContext(`Expect url: ${url} to be blocked`)
                .toBe(false)
        }
    })
    it('should return true if url is expected to match', () => {
        const validCases = [
            'https://convert.ad-company.example/',
            'https://convert.ad-company.site/',
            'https://convert.ad-company.site/url/test/case.sjs',
            'https://convert.ad-company.site/url/test/case.sjs?param=value',
            'https://convert.ad-company.site/url/test/case.sjs?param=value&param2=value2',
            'https://other.convert.ad-company.site/',
            'https://other.convert.ad-company.site/url/test/case.sjs',
            'https://other.convert.ad-company.site/url/test/case.sjs?param=value'
        ]
        for (const url of validCases) {
            expect(adClickAttributionPolicy.resourcePermitted(url))
                .withContext(`Expect url: ${url} to be permitted`)
                .toBe(true)
        }
    })
})
