const chromeWrapper = require('../../shared/js/background/chrome-wrapper.es6.js')
const tds = require('../../shared/js/background/trackers.es6')
const tdsStorage = require('../../shared/js/background/storage/tds.es6')
const tdsStorageStub = require('./../helpers/tds.es6')
const redirect = require('../../shared/js/background/redirect.es6')
const Tab = require('../../shared/js/background/classes/tab.es6')
const tabManager = require('../../shared/js/background/tab-manager.es6')
const trackerutils = require('../../shared/js/background/tracker-utils')
const settings = require('../../shared/js/background/settings.es6')

describe('Tracker Utilities', () => {
    let tabObserver
    let managerObserver
    let chromeObserver
    let popupObserver
    let experimentObserver

    beforeAll(() => {
        tdsStorageStub.stub()
        settings.updateSetting('activeExperiment', true)
        settings.updateSetting('experimentData', { blockFacebook: true })
        /* eslint-disable no-unused-vars */
        experimentObserver = spyOn(trackerutils, 'facebookExperimentIsActive').and.returnValue(true)
        chromeObserver = spyOn(chromeWrapper, 'getExtensionURL').and.returnValue('chrome://extension/')
        popupObserver = spyOn(chromeWrapper, 'notifyPopup').and.returnValue(undefined)
        tabObserver = spyOn(Tab, 'constructor')
        managerObserver = spyOn(tabManager, 'get')
        tdsStorage.getLists()
            .then(lists => {
                return tds.setLists(lists)
            })
    })

    describe('Click-to-Load', () => {
        let tab

        beforeAll(() => {
            tab = {
                id: 123,
                requestId: 123,
                url: 'http://example.com',
                status: 200,
                addOrUpdateTrackersBlocked: () => {},
                addWebResourceAccess: () => {},
                site: {
                    whitelisted: false,
                    clickToLoad: []
                }
            }
        })

        const socialTrackers = [
            'https://facebook.com',
            'https://facebook.net',
            'https://developers.facebook.com/docs/plugins/',
            'https://www.facebook.com/plugins/like.php'
        ]
        it('Should block social trackers by default', () => {
            const requestData = {}
            tabObserver.and.returnValue(tab)
            managerObserver.and.returnValue(tab)
            for (const tracker of socialTrackers) {
                requestData.url = tracker
                settings.ready().then(() => {
                    expect(redirect.handleRequest(requestData)).withContext(`URL: ${tracker}`).toEqual({ cancel: true })
                })
            }
        })

        const sdkURLs = [
            'https://connect.facebook.net/en_US/sdk.js',
            'https://connect.facebook.net/en_GB/sdk.js'
        ]
        it('Should provide a surrogate SDK', () => {
            tabObserver.and.returnValue(tab)
            managerObserver.and.returnValue(tab)
            const requestData = {}
            for (const url of sdkURLs) {
                requestData.url = url
                settings.ready().then(() => {
                    expect(redirect.handleRequest(requestData).redirectUrl).withContext(`URL: ${url}`).toBeDefined()
                })
            }
        })

        it('Should allow requests after element click', () => {
            tab.site.clickToLoad.push('Facebook')
            tabObserver.and.returnValue(tab)
            managerObserver.and.returnValue(tab)
            const requestData = {}
            for (const url of socialTrackers) {
                requestData.url = url
                settings.ready().then(() => {
                    expect(redirect.handleRequest(requestData)).toEqual(undefined)
                })
            }
            // Reset to empty for other tests
            tab.site.clickToLoad = []
        })
    })
})
