/**
 * NOTE: this needs to be the first listener that's added
 *
 * on FF, we might actually miss the onInstalled event
 * if we do too much before adding it
 */
const ATB = require('./atb.es6')

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason.match(/install/)) {
        ATB.updateATBValues()
            .then(ATB.openPostInstallPage)
    }
})

/**
 * REQUESTS
 */

const constants = require('../../data/constants')
const redirect = require('./redirect.es6')
const tabManager = require('./tab-manager.es6')
const pixel = require('./pixel.es6')

chrome.webRequest.onBeforeRequest.addListener(
    redirect.handleRequest,
    {
        urls: ['<all_urls>'],
        types: constants.requestListenerTypes
    },
    ['blocking']
)

chrome.webRequest.onHeadersReceived.addListener(
    (request) => {
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

// message popup to close when the active tab changes
chrome.tabs.onActivated.addListener(() => chrome.runtime.sendMessage({closePopup: true}))

// search via omnibox

chrome.omnibox.onInputEntered.addListener(function (text) {
    chrome.tabs.query({
        'currentWindow': true,
        'active': true
    }, function (tabs) {
        chrome.tabs.update(tabs[0].id, {
            url: 'https://duckduckgo.com/?q=' + encodeURIComponent(text) + '&bext=' + localStorage['os'] + 'cl'
        })
    })
})

/**
 * MESSAGES
 */

const utils = require('./utils.es6')
const settings = require('./settings.es6')
const browserWrapper = require('./chrome-wrapper.es6')

// handle any messages that come from content/UI scripts
// returning `true` makes it possible to send back an async response
chrome.runtime.onMessage.addListener((req, sender, res) => {
    if (sender.id !== chrome.runtime.id) return

    if (req.getCurrentTab) {
        utils.getCurrentTab().then((tab) => {
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
    } else if (req.getTab) {
        res(tabManager.get({'tabId': req.getTab}))
        return true
    } else if (req.getSiteGrade) {
        const tab = tabManager.get({tabId: req.getSiteGrade})
        let grade = {}

        if (!tab.site.isSpecialDomain) {
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
 * ALARMS
 */

const abpLists = require('./abp-lists.es6')
const https = require('./https.es6')
const httpsStorage = require('./storage/https.es6')

// recheck adblock plus and https lists every 30 minutes
chrome.alarms.create('updateLists', {periodInMinutes: 30})
// update uninstall URL every 10 minutes
chrome.alarms.create('updateUninstallURL', {periodInMinutes: 10})

chrome.alarms.onAlarm.addListener(alarmEvent => {
    if (alarmEvent.name === 'updateLists') {
        settings.ready().then(() => {
            abpLists.updateLists()
            httpsStorage.getLists(constants.httpsLists)
                .then(lists => https.setLists(lists))
                .catch(e => console.log(e))
        })
    } else if (alarmEvent.name === 'updateUninstallURL') {
        chrome.runtime.setUninstallURL(ATB.getSurveyURL())
    }
})

/**
 * on start up
 */
let onStartup = () => {
    chrome.tabs.query({currentWindow: true, status: 'complete'}, function (savedTabs) {
        for (var i = 0; i < savedTabs.length; i++) {
            var tab = savedTabs[i]

            if (tab.url) {
                tabManager.create(tab)
            }
        }
    })

    settings.ready().then(() => {
        httpsStorage.getLists(constants.httpsLists)
            .then(lists => https.setLists(lists))
            .catch(e => console.log(e))
    })
}

// Listen for main_frame HTTPs upgrade errors
chrome.webRequest.onErrorOccurred.addListener((e) => {
    if (!(e.type === 'main_frame')) return
    
    let tab = tabManager.get({tabId: e.tabId})

    // We're only looking at failed main_frame upgrades. A tab can send multiple
    // main_frame request errors so we will only look at the first one then set tab.hasHttpsError.
    if (!tab || !tab.mainFrameUpgraded || tab.hasHttpsError) {
        return
    }

    if (e.error && e.url.match(/^https/)) {
        const errCode = constants.httpsErrorCodes[e.error]
        tab.hasHttpsError = true

        if (errCode) {
            const url = new URL(e.url)
            pixel.fire('ehd', {
                'url': `${encodeURIComponent(url.hostname + url.pathname)}`,
                'error': errCode
            })
        }
    }
}, {urls: ['<all_urls>']})

module.exports = {
    onStartup: onStartup
}
