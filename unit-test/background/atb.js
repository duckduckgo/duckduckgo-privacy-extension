require('../helpers/mock-browser-api')
const atb = require('../../shared/js/background/atb').default
const settings = require('../../shared/js/background/settings')
const load = require('../../shared/js/background/load')
const browserWrapper = require('../../shared/js/background/wrapper')

const settingHelper = require('../helpers/settings')

// HELPERS

const stubLoadJSON = (ops) => {
    return spyOn(load, 'JSONfromExternalFile').and.callFake((url) => {
        return url.match(/duckduckgo\.com\/atb\.js/)
            ? Promise.resolve({ data: { version: ops.returnedAtb } })
            : Promise.resolve({ data: undefined })
    })
}

const stubLoadURL = () => {
    return spyOn(load, 'url').and.callFake((url) => {
        return Promise.resolve({ data: undefined })
    })
}

// ACTUAL TESTS

describe('atb.canShowPostInstall()', () => {
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

    canShowAtbCases.forEach((test) => {
        it(`should return ${test.result} when the domain is: '${test.domain}'`, () => {
            settingHelper.stub({ hasSeenPostInstall: false })

            const result = atb.canShowPostInstall(test.domain)
            expect(result).toBe(test.result)
        })
    })
})

describe('atb.addParametersMainFrameRequestUrl()', () => {
    const tests = [
        { url: 'http://duckduckgo.com/?q=something', rewrite: true },
        { url: 'https://duckduckgo.com/?q=something', rewrite: true },
        { url: 'https://duckduckgo.com/?q=something&atb=v70-1', rewrite: false },
        { url: 'https://duckduckgo.com/?q=atb', rewrite: true },
        { url: 'https://duckduckgo.com/js/spice/forecast/Denver%20Colorado%20United%20States/en', rewrite: false },
        { url: 'https://twitter.com', rewrite: false },
        { url: 'https://twitter.com/?u=duckduckgo.com', rewrite: false },
        { url: 'https://icons.duckduckgo.com/ip2/weather.com.ico', rewrite: false },
        { url: 'https://duckduckgo.com/t/ias_meanings?6753163&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false },
        { url: 'https://duckduckgo.com/share/spice/forecast/1347/forecast.css', rewrite: false },
        { url: 'https://duckduckgo.com/t/iaui?7725756&oi=forecast&r0=forecast&r1=forecast&r2=forecast&r5=en_wikipedia_queries,nlp_fathead,nlp_wiki&r8=news&r16=news&r19=forecast&r28=apps_domains&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false },
        { url: 'https://www.reddit.com/search?q=duckduckgo', rewrite: false },
        { url: 'https://duckduckgo.com/?q=whois+https://duckduckgo.com/?q=whois', rewrite: true },
        { url: 'https://beta.duckduckgo.com/t/ias_meanings?6753163&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false },
        { url: 'https://beta.duckduckgo.com/share/spice/forecast/1347/forecast.css', rewrite: false },
        { url: 'http://beta.duckduckgo.com/?q=something', rewrite: true },
        { url: 'https://beta.duckduckgo.com/?q=something', rewrite: true },
        { url: 'https://beta.duckduckgo.com/?q=something&atb=v70-1', rewrite: false },
        { url: 'https://dev-testing.duckduckgo.com/?q=something', rewrite: true },
        { url: 'https://dev-testing.duckduckgo.com/chrome_newtab', rewrite: true }
    ]

    beforeEach(() => {
        settingHelper.stub({ atb: 'v123-4ab' })
    })

    tests.forEach((test) => {
        it(`should${test.rewrite ? '' : ' not'} rewrite url: ${test.url}`, () => {
            const url = new URL(test.url)
            const result = atb.addParametersMainFrameRequestUrl(url)

            if (test.rewrite) {
                expect(result).toBeTrue()
            } else {
                expect(result).toBeFalse()
            }
        })
    })

    const correctUrlTests = [
        { url: 'https://duckduckgo.com/?q=something', expected: 'https://duckduckgo.com/?q=something&atb=v123-4ab' },
        { url: 'https://duckduckgo.com/about#newsletter', expected: 'https://duckduckgo.com/about?atb=v123-4ab#newsletter' },
        { url: 'https://duckduckgo.com/chrome_newtab', expected: 'https://duckduckgo.com/chrome_newtab?atb=v123-4ab' },
        { url: 'https://duckduckgo.com/chrome_newtab?ntp_test=true', expected: 'https://duckduckgo.com/chrome_newtab?ntp_test=true&atb=v123-4ab' }
    ]

    correctUrlTests.forEach((test) => {
        it(`should rewrite ${test.url} correctly`, () => {
            const url = new URL(test.url)
            const result = atb.addParametersMainFrameRequestUrl(url)
            expect(result).toBeTrue()
            expect(url.href).toEqual(test.expected)
        })
    })
})

describe('atb.setInitialVersions()', () => {
    it('should grab the version from the ATB service and save it to settings', (done) => {
        settingHelper.stub({ atb: null })
        stubLoadJSON({ returnedAtb: 'v111-4' })

        atb.setInitialVersions().then(() => {
            expect(settings.getSetting('atb')).toEqual('v111-4')

            done()
        })
    })

    it('should bail if the version has already been set', (done) => {
        settingHelper.stub({ atb: 'v111-5' })
        const loadJSONSpy = stubLoadJSON({ returnedAtb: 'v111-6' })

        atb.setInitialVersions().then(() => {
            expect(loadJSONSpy).not.toHaveBeenCalled()
            expect(settings.getSetting('atb')).toEqual('v111-5')

            done()
        })
    })

    it('should try hitting atb.js a few times if it\'s down', (done) => {
        settingHelper.stub({ atb: null })
        const loadJSONSpy = spyOn(load, 'JSONfromExternalFile').and.returnValues(
            Promise.reject(new Error()),
            Promise.reject(new Error()),
            Promise.resolve({ data: { version: 'v111-5' } })
        )

        atb.setInitialVersions().then(() => {
            expect(loadJSONSpy).toHaveBeenCalledTimes(3)
            expect(settings.getSetting('atb')).toEqual('v111-5')

            done()
        })
    })
})

describe('atb.updateSetAtb()', () => {
    it('should hit atb service with atb and set_atb when both are set', (done) => {
        settingHelper.stub({ atb: 'v111-2', set_atb: 'v111-6' })
        const loadJSONSpy = stubLoadJSON({ returnedAtb: 'v112-2' })

        atb.updateSetAtb().then(() => {
            expect(loadJSONSpy).toHaveBeenCalledWith(jasmine.stringMatching(/atb=v111-2&set_atb=v111-6/))
            expect(settings.getSetting('atb')).toEqual('v111-2')
            expect(settings.getSetting('set_atb')).toEqual('v112-2')

            done()
        })
    })

    it('should be able to handle cases where set_atb is null', (done) => {
        settingHelper.stub({ atb: 'v111-2' })
        const loadJSONSpy = stubLoadJSON({ returnedAtb: 'v112-2' })

        atb.updateSetAtb().then(() => {
            expect(loadJSONSpy).toHaveBeenCalledWith(jasmine.stringMatching(/atb=v111-2/))
            expect(settings.getSetting('atb')).toEqual('v111-2')
            expect(settings.getSetting('set_atb')).toEqual('v112-2')

            done()
        })
    })

    it('should be reset atb when null', (done) => {
        settingHelper.stub({ set_atb: 'v112-1' })
        const loadJSONSpy = stubLoadJSON({ returnedAtb: 'v112-2' })

        atb.updateSetAtb().then(() => {
            expect(loadJSONSpy).toHaveBeenCalledWith(jasmine.stringMatching(/atb=v1-1/))
            expect(loadJSONSpy).toHaveBeenCalledWith(jasmine.stringMatching(/set_atb=v112-1/))
            expect(loadJSONSpy).toHaveBeenCalledWith(jasmine.stringMatching(/e=1/))

            expect(settings.getSetting('atb')).toEqual('v112-2')
            expect(settings.getSetting('set_atb')).toEqual('v112-2')

            done()
        })
    })
})

describe('getAcceptedParamsFromURL()', () => {
    const tests = [
        { url: 'https://duckduckgo.com/?natb=v123-4ab&cp=atbhc', output: 'atb=v123-4ab&cp=atbhc' },
        { url: 'https://duckduckgo.com/?natb=v123-4&cp=atbhc', output: 'atb=v123-4&cp=atbhc' },
        { url: 'https://duckduckgo.com/?natb=v123-4_b&cp=atbhc', output: 'atb=v123-4_b&cp=atbhc' },
        { url: 'https://duckduckgo.com/?natb=v123-4__&cp=atbhc', output: 'atb=v123-4__&cp=atbhc' },
        { url: 'https://duckduckgo.com/?q=123&natb=v123-4__&cp=atbhc', output: 'atb=v123-4__&cp=atbhc' },
        { url: 'https://duckduckgo.com/?q=123&natb=v123-4__&foo=bar&cp=atbhc', output: 'atb=v123-4__&cp=atbhc' },

        { url: 'https://duckduckgo.com/about', output: '' },
        { url: 'https://duckduckgo.com/?natb=v123-4a', output: '' },
        { url: 'https://duckduckgo.com/?nnatb=v123-4ab', output: '' },
        { url: 'https://duckduckgo.com/?natb=v123-4abc', output: '' },
        { url: 'https://duckduckgo.com/?natb=v123-4___', output: '' },
        { url: 'https://duckduckgo.com/?natb=v123_sdf', output: '' },
        { url: 'https://duckduckgo.com/?natb=v11111111', output: '' },
        { url: 'https://duckduckgo.com/?natb=v111-4444', output: '' },
        { url: 'https://duckduckgo.com/?natb=v123-4abcd&foo=bar', output: '' }
    ]

    tests.forEach((test) => {
        it(`should get atb ${test.output} from ${test.url}`, () => {
            expect((atb.getAcceptedParamsFromURL(test.url)).toString()).toEqual(test.output)
        })
    })
})

describe('complex install workflow cases', () => {
    let loadURLSpy

    // make sure /exti was hit, and hit just once
    const validateExtiWasHit = (expectedAtb) => {
        let numExtiCalls = 0

        loadURLSpy.calls.allArgs().forEach((args) => {
            const url = args[0]

            if (url.match(/\/exti/)) {
                numExtiCalls += 1
                expect(url).toContain('atb=' + expectedAtb)
            }
        })

        expect(numExtiCalls).toEqual(1, 'exti service should\'ve been called exactly once')
    }

    beforeEach(() => {
        stubLoadJSON({ returnedAtb: 'v112-2' })
        loadURLSpy = stubLoadURL()
        settingHelper.stub()
    })

    it('should handle the install process correctly if there\'s no DDG pages open', () => {
        spyOn(browserWrapper, 'getDDGTabUrls').and.returnValue(Promise.resolve([]))

        return atb.updateATBValues()
            .then(() => {
                validateExtiWasHit('v112-2')
                expect(settings.getSetting('atb')).toEqual('v112-2')
                expect(settings.getSetting('set_atb')).toEqual('v112-2')
            })
    })
    it('should handle the install process correctly if there\'s DDG pages open that pass an ATB param', () => {
        // pretend one of the pages has an ATB to pass
        spyOn(browserWrapper, 'getDDGTabUrls').and.returnValue(Promise.resolve([
            'https://duckduckgo.com/about',
            'https://duckduckgo.com/?natb=v112-2ab'
        ]))

        return atb.updateATBValues()
            .then(() => {
                validateExtiWasHit('v112-2ab')
                expect(settings.getSetting('atb')).toEqual('v112-2ab')
                expect(settings.getSetting('set_atb')).toEqual('v112-2ab')
            })
    })
    it('should handle the install process correctly if there\'s DDG pages open that do not pass an ATB param', () => {
        // pretend no pages have ATB to pass
        spyOn(browserWrapper, 'getDDGTabUrls').and.returnValue(Promise.resolve([
            'https://duckduckgo.com/about',
            'https://duckduckgo.com/?q=test'
        ]))

        return atb.updateATBValues()
            .then(() => {
                validateExtiWasHit('v112-2')
                expect(settings.getSetting('atb')).toEqual('v112-2')
                expect(settings.getSetting('set_atb')).toEqual('v112-2')
            })
    })
})
