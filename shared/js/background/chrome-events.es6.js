/**
 * NOTE: this needs to be the first listener that's added
 *
 * on FF, we might actually miss the onInstalled event
 * if we do too much before adding it
 */
const ATB = require('./atb.es6')
const utils = require('./utils.es6')
const experiment = require('./experiments.es6')
const browser = utils.getBrowserName()

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason.match(/install/)) {
        ATB.updateATBValues()
            .then(ATB.openPostInstallPage)
            .then(function () {
                if (browser === 'chrome') {
                    experiment.setActiveExperiment()
                }
            })
    } else if (details.reason.match(/update/) && browser === 'chrome') {
        experiment.setActiveExperiment()
    }
})

/**
 * REQUESTS
 */

const redirect = require('./redirect.es6')
const tabManager = require('./tab-manager.es6')
const pixel = require('./pixel.es6')
const https = require('./https.es6')
const constants = require('../../data/constants')
let requestListenerTypes = utils.getUpdatedRequestListenerTypes()

// Shallow copy of request types
// And add beacon type based on browser, so we can block it
chrome.webRequest.onBeforeRequest.addListener(
    redirect.handleRequest,
    {
        urls: ['<all_urls>'],
        types: requestListenerTypes
    },
    ['blocking']
)

chrome.webRequest.onHeadersReceived.addListener(
    request => {
        if (request.type === 'main_frame') {
            tabManager.updateTabUrl(request)
        }

        if (/^https?:\/\/(.*?\.)?duckduckgo.com\/\?/.test(request.url)) {
            // returns a promise
            return ATB.updateSetAtb(request)
        }
    },
    {
        urls: ['<all_urls>']
    }
)

/**
 * Web Navigation
 */
// keep track of URLs that the browser navigates to.
//
// this is currently meant to supplement tabManager.updateTabUrl() above:
// tabManager.updateTabUrl only fires when a tab has finished loading with a 200,
// which misses a couple of edge cases like browser special pages
// and Gmail's weird redirect which returns a 200 via a service worker
chrome.webNavigation.onCommitted.addListener(details => {
    // ignore navigation on iframes
    if (details.frameId !== 0) return

    const tab = tabManager.get({ tabId: details.tabId })

    if (!tab) return

    tab.updateSite(details.url)
})

/**
 * TABS
 */

const Companies = require('./companies.es6')

chrome.tabs.onUpdated.addListener((id, info) => {
    // sync company data to storage when a tab finishes loading
    if (info.status === 'complete') {
        Companies.syncToStorage()
    }

    tabManager.createOrUpdateTab(id, info)
})

chrome.tabs.onRemoved.addListener((id, info) => {
    // remove the tab object
    tabManager.delete(id)
})

// message popup to close when the active tab changes. this can send an error message when the popup is not open. check lastError to hide it
chrome.tabs.onActivated.addListener(() => chrome.runtime.sendMessage({ closePopup: true }, () => chrome.runtime.lastError))

// search via omnibox
chrome.omnibox.onInputEntered.addListener(function (text) {
    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function (tabs) {
        chrome.tabs.update(tabs[0].id, {
            url: 'https://duckduckgo.com/?q=' + encodeURIComponent(text) + '&bext=' + localStorage['os'] + 'cl'
        })
    })
})

/**
 * MESSAGES
 */

const settings = require('./settings.es6')
const browserWrapper = require('./chrome-wrapper.es6')

// handle any messages that come from content/UI scripts
// returning `true` makes it possible to send back an async response
chrome.runtime.onMessage.addListener((req, sender, res) => {
    if (sender.id !== chrome.runtime.id) return

    if (req.getCurrentTab) {
        utils.getCurrentTab().then(tab => {
            res(tab)
        })

        return true
    }

    if (req.updateSetting) {
        let name = req.updateSetting['name']
        let value = req.updateSetting['value']
        settings.ready().then(() => {
            settings.updateSetting(name, value)
        })
    } else if (req.getSetting) {
        let name = req.getSetting['name']
        settings.ready().then(() => {
            res(settings.getSetting(name))
        })

        return true
    }

    // popup will ask for the browser type then it is created
    if (req.getBrowser) {
        res(utils.getBrowserName())
        return true
    }

    if (req.getExtensionVersion) {
        res(browserWrapper.getExtensionVersion())
        return true
    }

    if (req.getTopBlocked) {
        res(Companies.getTopBlocked(req.getTopBlocked))
        return true
    } else if (req.getTopBlockedByPages) {
        res(Companies.getTopBlockedByPages(req.getTopBlockedByPages))
        return true
    } else if (req.resetTrackersData) {
        Companies.resetData()
    }

    if (req.whitelisted) {
        tabManager.whitelistDomain(req.whitelisted)
    } else if (req.whitelistOptIn) {
        tabManager.setGlobalWhitelist('whitelistOptIn', req.whitelistOptIn.domain, req.whitelistOptIn.value)
    } else if (req.getTab) {
        res(tabManager.get({ tabId: req.getTab }))
        return true
    } else if (req.getSiteGrade) {
        const tab = tabManager.get({ tabId: req.getSiteGrade })
        let grade = {}

        if (!tab.site.specialDomainName) {
            grade = tab.site.grade.get()
        }

        res(grade)
        return true
    }

    if (req.firePixel) {
        let fireArgs = req.firePixel
        if (fireArgs.constructor !== Array) {
            fireArgs = [req.firePixel]
        }
        res(pixel.fire.apply(null, fireArgs))
        return true
    }
})

/**
 * Fingerprint Protection
 */

// Inject fingerprint protection into sites when
// they are not whitelisted.
chrome.webNavigation.onCommitted.addListener(details => {
    const activeExperiment = settings.getSetting('activeExperiment')

    if (activeExperiment) {
        const experiment = settings.getSetting('experimentData')

        if (experiment && experiment.fingerprint_protection) {
            const whitelisted = settings.getSetting('whitelisted')
            const tabURL = new URL(details.url) || {}
            if (!whitelisted || !whitelisted[tabURL.hostname]) {
                const scriptDetails = {
                    'file': '/data/fingerprint-protection.js',
                    'runAt': 'document_start',
                    'allFrames': true,
                    'matchAboutBlank': true
                }
                chrome.tabs.executeScript(details.tabId, scriptDetails)
            }
        }
    }
})

/**
 * ALARMS
 */

const httpsStorage = require('./storage/https.es6')
const httpsService = require('./https-service.es6')
const tdsStorage = require('./storage/tds.es6')
const trackers = require('./trackers.es6')

// recheck tracker and https lists every 12 hrs
chrome.alarms.create('updateHTTPSLists', { periodInMinutes: 12 * 60 })
// tracker lists / whitelists are 30 minutes
chrome.alarms.create('updateLists', { periodInMinutes: 30 })
// update uninstall URL every 10 minutes
chrome.alarms.create('updateUninstallURL', { periodInMinutes: 10 })
// remove expired HTTPS service entries
chrome.alarms.create('clearExpiredHTTPSServiceCache', { periodInMinutes: 60 })

chrome.alarms.onAlarm.addListener(alarmEvent => {
    if (alarmEvent.name === 'updateHTTPSLists') {
        settings.ready().then(() => {
            httpsStorage.getLists(constants.httpsLists)
                .then(lists => https.setLists(lists))
                .catch(e => console.log(e))
        })
    } else if (alarmEvent.name === 'updateUninstallURL') {
        chrome.runtime.setUninstallURL(ATB.getSurveyURL())
    } else if (alarmEvent.name === 'updateLists') {
        settings.ready().then(() => {
            https.sendHttpsUpgradeTotals()
        })

        tdsStorage.getLists()
            .then(lists => trackers.setLists(lists))
            .catch(e => console.log(e))
    } else if (alarmEvent.name === 'clearExpiredHTTPSServiceCache') {
        httpsService.clearExpiredCache()
    }
})

/**
 * on start up
 */
let onStartup = () => {
    chrome.tabs.query({ currentWindow: true, status: 'complete' }, function (savedTabs) {
        for (var i = 0; i < savedTabs.length; i++) {
            var tab = savedTabs[i]

            if (tab.url) {
                tabManager.create(tab)
            }
        }
    })

    settings.ready().then(() => {
        experiment.setActiveExperiment()

        httpsStorage.getLists(constants.httpsLists)
            .then(lists => https.setLists(lists))
            .catch(e => console.log(e))

        tdsStorage.getLists()
            .then(lists => trackers.setLists(lists))
            .catch(e => console.log(e))

        https.sendHttpsUpgradeTotals()

        Companies.buildFromStorage()
    })
}

// Fire pixel on https upgrade failures to allow bad data to be removed from lists
chrome.webRequest.onErrorOccurred.addListener(e => {
    if (!(e.type === 'main_frame')) return

    let tab = tabManager.get({ tabId: e.tabId })

    // We're only looking at failed main_frame upgrades. A tab can send multiple
    // main_frame request errors so we will only look at the first one then set tab.hasHttpsError.
    if (!tab || !tab.mainFrameUpgraded || tab.hasHttpsError) {
        return
    }

    if (e.error && e.url.match(/^https/)) {
        const errCode = constants.httpsErrorCodes[e.error]
        tab.hasHttpsError = true

        if (errCode) {
            https.incrementUpgradeCount('failedUpgrades')
            const url = new URL(e.url)
            pixel.fire('ehd', {
                url: `${encodeURIComponent(url.hostname)}`,
                error: errCode
            })
        }
    }
}, { urls: ['<all_urls>'] })

module.exports = {
    onStartup: onStartup
}
