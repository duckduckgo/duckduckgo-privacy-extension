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

        // need to wait a bit for ATB to be set
        setTimeout(() => ATB.openPostInstallPage(), 2000)
    }
})

/**
 * REQUESTS
 */

const constants = require('../../data/constants')
const redirect = require('./redirect.es6')
const tabManager = require('./tab-manager.es6')

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

    if (req.atb) {
        ATB.setAtbValuesFromSuccessPage(req.atb)
    }

    // listen for messages from content scripts injected into frames
    // on specific domains. Respond with list of blocked requests.
    if (req.hideElements) {
        const requestTab = tabManager.get({tabId: sender.tab.id})
        if (requestTab.parentEntity === 'Oath' && !requestTab.site.whitelisted) {
            if (req.frame === 'main') {
                // in main frame, we only care about blocked frames
                let blockedAssets = requestTab.getBlockedAssets('sub_frame').join('|')
                chrome.tabs.sendMessage(sender.tab.id, {type: 'blockedRequests', blockedRequests: blockedAssets, frame: 'main'}, {frameId: sender.frameId})
            } else if (req.frame === 'topLevelFrame') {
                // in iframes, we need both blocked frames and blocked scripts, since
                // these blocked scripts often were going to load a nested iframe
                let blockedAssets = requestTab.getBlockedAssets(['sub_frame', 'script']).join('|')
                chrome.tabs.sendMessage(sender.tab.id, {type: 'blockedRequests', blockedRequests: blockedAssets, mainFrameUrl: requestTab.url, frame: 'topLevelFrame'}, {frameId: sender.frameId})
            }
        } else {
            // if site does not belong to parent company or is whitelisted, disable content scripts
            chrome.tabs.sendMessage(sender.tab.id, {type: 'disable'}, {frameId: sender.frameId})
        }
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
    } else if (req.getSiteScore) {
        let tab = tabManager.get({tabId: req.getSiteScore})
        res(tab.site.score.get())
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
                let newTab = tabManager.create(tab)
                // check https status of saved tabs so we have the correct site score
                if (newTab.url.match(/^https:\/\//)) {
                    newTab.site.score.update({hasHTTPS: true})
                }
            }
        }
    })

    settings.ready().then(() => {
        httpsStorage.getLists(constants.httpsLists)
            .then(lists => https.setLists(lists))
            .catch(e => console.log(e))
    })
}

module.exports = {
    onStartup: onStartup
}
