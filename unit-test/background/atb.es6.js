const atb = require('../../shared/js/background/atb.es6')
const settings = require('../../shared/js/background/settings.es6')
const browserWrapper = require('../../shared/js/background/chrome-wrapper.es6')
const load = require('../../shared/js/background/load.es6')

const canShowAtbCases = [
    {
        domain: 'duckduckgo.com/software',
        result: false
    }, {
        domain: 'duckduckgo.com/app',
        result: false
    }, {
        domain: undefined,
        result: false
    }, {
        domain: 'duckduckgo.com/about',
        result: true
    }, {
        domain: 'duckduckgo.com',
        result: true
    }
]

describe('atb.canShowPostInstall()', () => {
    canShowAtbCases.forEach((test) => {
        it(`should return ${test.result} when the domain is: '${test.domain}'`, () => {
            // ensure settings.getSettings('hasSeenPostInstall') == false
            spyOn(settings, 'getSetting').withArgs('hasSeenPostInstall').and.returnValue(false)

            const result = atb.canShowPostInstall(test.domain)
            expect(result).toBe(test.result)
        })
    })
})

describe('atb.redirectURL()', () => {
    let tests = [
        {url: 'http://duckduckgo.com/?q=something', rewrite: true },
        {url: 'https://duckduckgo.com/?q=something', rewrite: true },
        {url: 'https://duckduckgo.com/?q=something&atb=v70-1', rewrite: false },
        {url: 'https://duckduckgo.com/?q=atb', rewrite: true},
        {url: 'https://duckduckgo.com/js/spice/forecast/Denver%20Colorado%20United%20States/en', rewrite: false},
        {url: 'https://twitter.com', rewrite: false },
        {url: 'https://twitter.com/?u=duckduckgo.com', rewrite: false },
        {url: 'https://icons.duckduckgo.com/ip2/weather.com.ico', rewrite: false},
        {url: 'https://duckduckgo.com/t/ias_meanings?6753163&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false},
        {url: 'https://duckduckgo.com/share/spice/forecast/1347/forecast.css', rewrite: false},
        {url: 'https://duckduckgo.com/t/iaui?7725756&oi=forecast&r0=forecast&r1=forecast&r2=forecast&r5=en_wikipedia_queries,nlp_fathead,nlp_wiki&r8=news&r16=news&r19=forecast&r28=apps_domains&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false},
        {url: 'https://www.reddit.com/search?q=duckduckgo', rewrite: false},
        {url: 'https://duckduckgo.com/?q=whois+https://duckduckgo.com/?q=whois', rewrite: true},
        {url: 'https://beta.duckduckgo.com/t/ias_meanings?6753163&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false},
        {url: 'https://beta.duckduckgo.com/share/spice/forecast/1347/forecast.css', rewrite: false},
        {url: 'http://beta.duckduckgo.com/?q=something', rewrite: true },
        {url: 'https://beta.duckduckgo.com/?q=something', rewrite: true },
        {url: 'https://beta.duckduckgo.com/?q=something&atb=v70-1', rewrite: false }
    ]

    beforeEach(() => {
        spyOn(settings, 'getSetting').withArgs('atb').and.returnValue('v123-4ab')
    })

    tests.forEach((test) => {
        it(`should${test.rewrite ? '' : ' not'} rewrite url: ${test.url}`, () => {
            let result = atb.redirectURL({ url: test.url })

            if (test.rewrite) {
                expect(result.redirectUrl).toBeTruthy()
            } else {
                expect(result).toBeFalsy()
            }
        })
    })

    let correctUrlTests = [
        {url: 'https://duckduckgo.com/?q=something', expected: 'https://duckduckgo.com/?q=something&atb=v123-4ab'},
        {url: 'https://duckduckgo.com/about#newsletter', expected: 'https://duckduckgo.com/about?atb=v123-4ab#newsletter'}
    ]

    correctUrlTests.forEach((test) => {
        it(`should rewrite ${test.url} correctly`, () => {
            expect(atb.redirectURL({ url: test.url }).redirectUrl).toEqual(test.expected)
        })
    })
})
