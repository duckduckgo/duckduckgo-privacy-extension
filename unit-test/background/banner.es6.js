const banner = require('../../shared/js/background/banner.es6')
const pixel = require('../../shared/js/background/pixel.es6')
// const settings = require('../../shared/js/background/settings.es6')
const settingHelper = require('../helpers/settings.es6')

fdescribe('banner.handleOnCommitted ', () => {
    const passingTests = [
        {
            pixelID: 'evg',
            pixelOps: {be: 1},
            details: {
                tabId: 0,
                frameId: 0,
                transitionType: 'form_submit',
                url: 'https://www.google.com/search?q=test'
            }
        },
        {
            pixelID: 'evd',
            pixelOps: {be: 1},
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
    const tests = [
        { tabId: 0, frameId: 0, transitionType: 'form_submit', url: 'https://www.google.com/search?q=test' },
        { tabId: 0, frameId: 0, transitionType: 'generated', url: 'https://www.duckduckgo.com/?q=test' }
    ]

    tests.forEach((test) => {
        it(`shows a banner for ${test.url}`, () => {
            spyOn(settings, 'getSetting').and.returnValue(false)
            banner.handleOnDOMContentLoaded(test)
            expect(chrome.tabs.insertCSS).toHaveBeenCalled()
        })
    })
})
