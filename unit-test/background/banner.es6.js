const chrome = require('sinon-chrome/extensions')

const banner = require('../../shared/js/background/banner.es6')
const pixel = require('../../shared/js/background/pixel.es6')
const settings = require('../../shared/js/background/settings.es6')
const settingHelper = require('../helpers/settings.es6')

const testURLs = require('./../data/bannerTestURLs.json')

const BANNER_EXP_NAME = 'privacy_nudge'
const BANNER_SETTING = 'bannerEnabled'

fdescribe('banner ', () => {
    describe('banner._isBannerURL', () => {
        testURLs.forEach((test) => {
            const result = banner.test_isBannerURL(test.url)

            if (test.passes && test.passes.includes('isBannerURL')) {
                it(`accepts ${test.url}`, () => {
                    expect(result).toBe(true)
                })
            } else {
                it(`does not accept ${test.url}`, () => {
                    const result = banner.test_isBannerURL(test.url)
                    expect(result).toBeFalsy()
                })
            }
        })
    })

    describe('banner._isDDGSerp', () => {
        testURLs.forEach((test) => {
            const result = banner.test_isDDGSerp(test.url)

            if (test.passes && test.passes.includes('isDDGSerp')) {
                it(`accepts ${test.url}`, () => {
                    expect(result).toBe(true)
                })
            } else {
                it(`does not accept ${test.url}`, () => {
                    const result = banner.test_isDDGSerp(test.url)
                    expect(result).toBeFalsy()
                })
            }
        })
    })

    describe('banner._isOtherSerp', () => {
        testURLs.forEach((test) => {
            const result = banner.test_isOtherSerp(test.url)

            if (test.passes && test.passes.includes('isOtherSerp')) {
                it(`accepts ${test.url}`, () => {
                    expect(result).toBe(true)
                })
            } else {
                it(`does not accept ${test.url}`, () => {
                    const result = banner.test_isOtherSerp(test.url)
                    expect(result).toBeFalsy()
                })
            }
        })
    })

    describe('banner._isValidTransitionType', () => {
        const validTransitions = [
            { url: 'https://duckduckgo.com', transitionType: 'generated', transitionQualifiers: [] },
            { url: 'https://duckduckgo.com', transitionType: 'form_submit', transitionQualifiers: [] },
            {
                // Has bext param in url
                url: 'https://duckduckgo.com/?q=tests&bext=mcr',
                transitionQualifiers: [],
                transitionType: 'link'
            },
            {
                url: 'https://duckduckgo.com',
                // Link with server_redirect
                transitionQualifiers: ['server_redirect'],
                transitionType: 'link'
            }
        ]

        const invalidTransitions = [
            { url: 'https://duckduckgo.com', transitionType: 'link', transitionQualifiers: [] },
            { url: 'https://duckduckgo.com', transitionType: 'typed', transitionQualifiers: [] },
            { url: 'https://duckduckgo.com', transitionType: 'auto_bookmark', transitionQualifiers: [] },
            { url: 'https://duckduckgo.com', transitionType: 'auto_subframe', transitionQualifiers: [] },
            { url: 'https://duckduckgo.com', transitionType: 'manual_subframe', transitionQualifiers: [] },
            { url: 'https://duckduckgo.com', transitionType: 'start_page', transitionQualifiers: [] },
            { url: 'https://duckduckgo.com', transitionType: 'reload', transitionQualifiers: [] },
            { url: 'https://duckduckgo.com', transitionType: 'keyword', transitionQualifiers: [] },
            { url: 'https://duckduckgo.com', transitionType: 'keyword_generated', transitionQualifiers: [] }
        ]

        validTransitions.forEach((test) => {
            const result = banner.test_isValidTransitionType(test)

            it(`accepts ${test.url}`, () => {
                expect(result).toBe(true)
            })
        })

        invalidTransitions.forEach((test) => {
            const result = banner.test_isValidTransitionType(test)

            it(`accepts ${test.url}`, () => {
                expect(result).toBeFalsy()
            })
        })
    })

    describe('banner.handleOnCommitted ', () => {
        const passingTests = [
            {
                pixelID: 'evg',
                pixelOps: { be: 1 },
                details: {
                    transitionType: 'form_submit',
                    url: 'https://www.google.com/search?q=test'
                }
            },
            {
                pixelID: 'evd',
                pixelOps: { be: 1 },
                details: {
                    tabId: 0,
                    frameId: 0,
                    transitionType: 'form_submit',
                    url: 'https://duckduckgo.com/?q=test'
                }
            }
        ]

        beforeAll(() => {
            spyOn(pixel, 'fire')
        })

        passingTests.forEach((test) => {
            it(`fires a pixel for ${test.details.url}`, () => {
                settingHelper.stub({
                    activeExperiment: {name: 'privacy_nudge'},
                    bannerEnabled: true
                })
                banner.handleOnCommitted(test.details)
                expect(pixel.fire).toHaveBeenCalledWith(test.pixelID, test.pixelOps)
            })
        })
    })

    describe('banner.handleOnDOMContentLoaded', () => {
        const passingTests = [{
            tabId: 0,
            frameId: 0,
            url: 'https://www.google.com/'
        }, {
            tabId: 0,
            frameId: 0,
            url: 'https://www.google.com/search?q=test'
        }]

        const failingTests = [{
            tabId: 0,
            frameId: 0,
            url: 'https://www.google.com/search?q=test&hl=de'
        },
        {
            tabId: 0,
            // invalid frameId
            frameId: 1,
            url: 'https://www.google.com/search?q=test'
        },
        {
            tabId: 0,
            frameId: 0,
            // invalid url
            url: 'https://www.duckduckgo.com'
        }]

        beforeAll(() => {
            window.chrome = chrome
        })

        passingTests.forEach((test) => {
            it(`shows a banner for ${test.url}`, () => {
                settingHelper.stub({
                    activeExperiment: { name: 'privacy_nudge' },
                    bannerEnabled: true
                })
                const result = banner.handleOnDOMContentLoaded(test)
                expect(result).toBeTruthy()
            })
        })

        failingTests.forEach((test) => {
            it(`should not show a banner for ${test.url}`, () => {
                settingHelper.stub({
                    activeExperiment: { name: 'privacy_nudge' },
                    bannerEnabled: true
                })
                const result = banner.handleOnDOMContentLoaded(test)
                expect(result).toBeFalsy()
            })
        })

        afterAll(() => {
            delete window.chrome
        })
    })
})
