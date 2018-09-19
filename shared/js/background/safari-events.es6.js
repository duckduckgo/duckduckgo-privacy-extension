/* global safari:false */
const ATB = require('./atb.es6')
const tabManager = require('./tab-manager.es6')
const Companies = require('./companies.es6')
const settings = require('./settings.es6')
const abpLists = require('./abp-lists.es6')
const browserWrapper = require('./safari-wrapper.es6')

let _getSafariTabIndex = (target) => {
    for (let i = 0; i < safari.application.activeBrowserWindow.tabs.length; i++) {
        if (target === safari.application.activeBrowserWindow.tabs[i]) {
            return i
        }
    }
}

/** onStartup
 * Safari doesn't have a onInstalled event so we'll set a flag in localStorage.
 * 1. check installed flag
 * 2. go through all current tabs and recreate our own internal tab objects
 * 3. open post install page only if we're on a DDG page or Safari gallery page
 */
let onStartup = () => {
    if (!safari.extension.settings.installed) {
        safari.extension.settings.installed = true
        ATB.updateATBValues()
    }

    // show post install page
    let showPostInstallPage = false
    let postInstallRegex = /duckduckgo.com\/\?t=|safari-extensions.apple.com\/details\/\?id=com.duckduckgo.safari/

    safari.application.browserWindows.forEach((safariWindow) => {
        safariWindow.tabs.forEach((safariTab) => {
            // create a random safari tab id and store it in safariTab
            safariTab.ddgTabId = Math.floor(Math.random() * (10000000 - 10 + 1)) + 10

            if (safariTab.url.match(postInstallRegex)) {
                showPostInstallPage = true
            }

            // recreate our internal tab objects for any existing tabs
            // first create a fake request so we can let tab-manager handle this for us
            let req = {
                url: safariTab.url,
                target: safariTab,
                message: {currentURL: safariTab.url}
            }
            tabManager.create(req)
        })
    })

    if (showPostInstallPage) {
        // need at least 3s before atb is available in safari
        setTimeout(() => {
            // we'll open the post install page in a new tab but keep the current tab active. To do this
            // we need to open a tab then reset the active tab
            let activeTabIdx = _getSafariTabIndex(safari.application.activeBrowserWindow.activeTab)
            let postInstallURL = 'https://duckduckgo.com/app?post=1'
            // show atb in postinstall page
            const atb = settings.getSetting('atb')
            postInstallURL += atb ? `&atb=${atb}` : ''
            safari.application.activeBrowserWindow.openTab().url = postInstallURL

            // reactive the previous tab
            safari.application.activeBrowserWindow.tabs[activeTabIdx].activate()
        }, 3000)
    }

    // reload popup
    browserWrapper.notifyPopup()
}

const redirect = require('./redirect.es6')

// Messaging
// canLoad => request data from content script. Runs onBeforeRequest
// atb => set atb values from inject content script
//
let handleMessage = (e) => {
    if (e.name === 'canLoad') {
        onBeforeRequest(e)
    } else if (e.name === 'unloadTab') {
        onClose(e)
    } else if (e.name === 'getSetting') {
        getSetting(e)
    } else if (e.name === 'getExtensionVersion') {
        getExtensionVersion(e)
    } else if (e.name === 'updateSetting') {
        updateSetting(e)
    } else if (e.name === 'whitelisted') {
        tabManager.whitelistDomain(e.message.whitelisted)
    }
}

let getActiveTab = () => {
    let activeTab = safari.application.activeBrowserWindow.activeTab
    if (activeTab.ddgTabId) {
        return tabManager.get({tabId: activeTab.ddgTabId})
    } else {
        let id = browserWrapper.getTabId({target: activeTab})
        return tabManager.get({tabId: id})
    }
}

let handleUIMessage = (req, res) => {
    if (req.getCurrentTab || req.getTab) {
        res(getActiveTab())
    } else if (req.getTopBlocked) {
        res(Companies.getTopBlocked(req.getTopBlocked))
    } else if (req.getBrowser) {
        res('safari')
    } else if (req.whitelisted) {
        res(tabManager.whitelistDomain(req.whitelisted))
    } else if (req.getSetting) {
        settings.ready().then(() => {
            res(settings.getSetting(req.getSetting.name))
        })
    } else if (req.getSiteGrade) {
        let tab = tabManager.get({tabId: req.getSiteGrade})
        if (tab) res(tab.site.grade.get())
    } else if (req.getTopBlockedByPages) {
        res(Companies.getTopBlockedByPages(req.getTopBlockedByPages))
    } else if (req.resetTrackersData) {
        Companies.resetData()
        safari.self.hide()
    }
}

safari.extension.globalPage.contentWindow.message = handleUIMessage

let updateSetting = (e) => {
    let name = e.message.updateSetting.name
    let val = e.message.updateSetting.value
    if (name) {
        settings.updateSetting(name, val)
    }
}

let getSetting = (e) => {
    let name
    if (e.message.getSetting && e.message.getSetting.name) {
        name = e.message.getSetting.name
    } else {
        name = e.message.getSetting
    }

    let setting = JSON.parse(JSON.stringify(settings.getSetting(name)))

    // Safari extension pages can't pass a callback
    // so they have to include an id to help identify the correct response
    let message = {
        data: setting,
        id: e.message.id
    }

    console.log(`Message setting: ${name}, ${JSON.stringify(setting)}`)
    // send message back to extension page
    e.target.page.dispatchMessage('backgroundResponse', message)
}

let getExtensionVersion = (e) => {
    let message = {
        data: browserWrapper.getExtensionVersion(),
        id: e.message.id
    }

    e.target.page.dispatchMessage('backgroundResponse', message)
}

let onBeforeRequest = (requestData) => {
    let potentialTracker = requestData.message.potentialTracker
    let currentURL = requestData.message.mainFrameURL

    if (!(currentURL && potentialTracker)) return

    let tabId = requestData.target.ddgTabId || browserWrapper.getTabId(requestData)
    let thisTab = tabManager.get({tabId: tabId})
    requestData.tabId = tabId

    let isMainFrame = requestData.message.frame === 'main_frame'

    // if it's preloading a site in the background and the url changes, delete and recreate the tab
    if (thisTab && thisTab.url !== requestData.message.mainFrameURL) {
        tabManager.delete(tabId)
        thisTab = tabManager.create({
            tabId: tabId,
            url: requestData.message.mainFrameURL,
            target: requestData.target
        })
        console.log('onBeforeRequest DELETED AND RECREATED TAB because of url change:', thisTab)
    }

    if (!(thisTab) && isMainFrame) {
        requestData.url = requestData.message.mainFrameURL
        thisTab = tabManager.create(requestData)
        console.log('onBeforeRequest CREATED TAB:', thisTab)
    }

    requestData.url = potentialTracker

    let redirectRequest = redirect.handleRequest(requestData)
    if (redirectRequest) {
        return redirectRequest
    } else {
        return requestData
    }
}

// update the popup when switching browser windows
let onActivate = (e) => {
    let activeTab = getActiveTab()
    if (activeTab) {
        activeTab.updateBadgeIcon(e.target)
        safari.extension.popovers[0].contentWindow.location.reload()
    } else {
        // if we don't have an active tab then this is likely a new tab
        // this can happen when you open a new tab, click to activate another existing tab,
        // and then go back to the new tab. new tab -> existing tab -> back to new tab.
        // reset the badge to default and reload the popup to get the correct new tab data
        browserWrapper.setBadgeIcon({path: 'img/ddg-icon@2x.png', target: e.target})
        safari.extension.popovers[0].contentWindow.location.reload()
    }
}

// called when a page has successfully loaded:
let onNavigate = (e) => {
    let tabId = e.target.ddgTabId
    let tab = tabManager.get({tabId: tabId})

    if (tab) {
        tab.updateBadgeIcon(e.target)
        safari.extension.popovers[0].contentWindow.location.reload()

        if (!tab.site.didIncrementCompaniesData) {
            Companies.incrementTotalPages()
            tab.site.didIncrementCompaniesData = true

            if (tab.trackers && Object.keys(tab.trackers).length > 0) {
                Companies.incrementTotalPagesWithTrackers()
            }
        }

        // stash data in safari tab to handle cached pages
        if (!e.target.ddgCache) e.target.ddgCache = {}
        e.target.ddgCache[tab.url] = tab
    } else {
        browserWrapper.setBadgeIcon('img/ddg-icon.png', e.target)

        // if we don't have a tab with this tabId then we are in a cached page
        // use the target url to find the correct cached tab obj
        console.log('REBUILDING CACHED TAB')
        if (e.target.ddgCache) {
            let cachedTab = e.target.ddgCache[e.target.url]
            if (cachedTab) {
                tabManager.tabContainer[tabId] = cachedTab
                safari.extension.popovers[0].contentWindow.location.reload()
                cachedTab.updateBadgeIcon(e.target)
            }
        }
    }

    var urlMatch = e.target.url.match(/https?:\/\/duckduckgo.com\/\?*/)

    if (urlMatch && urlMatch[0]) {
        ATB.updateSetAtb()
    }
}

/**
 * Before navigating to a new page,
 * check whether we should upgrade to https
 */
var onBeforeNavigation = function (e) {
    // console.log(`onBeforeNavigation ${e.url} ${e.target.url}`)

    if (!e.url || !e.target || e.target.url === 'about:blank' || e.url.match(/com.duckduckgo.safari/)) return

    const url = e.url
    const tabId = browserWrapper.getTabId(e)

    let thisTab = tabId && tabManager.get({tabId: tabId})

    // if a tab already exists, but the url is different,
    // delete it and recreate for the new url
    if (thisTab && thisTab.url !== url) {
        tabManager.delete(tabId)
        thisTab = null
        console.log('onBeforeNavigation DELETED TAB because url did not match')
    }

    browserWrapper.setBadgeIcon({path: 'img/ddg-icon@2x.png', target: e.target})
}

var onBeforeSearch = function (evt) {
    if (!safari.extension.settings.default_search_engine) return

    let query = evt.query
    let DDG_URL = 'https://duckduckgo.com/?q='

    function checkURL (url) {
        var expr = /^(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/i
        var regex = RegExp(expr)
        var localhost = RegExp(/^(https?:\/\/)?localhost(:\d+)?/i)
        var about = RegExp(/(about|safari-extension):.*/)
        var nums = RegExp(/^(\d+\.\d+).*/i)
        return (url.match(regex) || url.match(about) || url.match(localhost)) && !url.match(nums)
    }

    if (!checkURL(query)) {
        evt.preventDefault()
        let url = DDG_URL + encodeURIComponent(query) + '&bext=msl'
        let atb = settings.getSetting('atb')
        if (atb) {
            url = url + '&atb=' + atb
        }
        evt.target.url = url
    }
}

let onClose = (e) => {
    let tabId = e.target.ddgTabId
    console.log(`Delete tab: ${tabId}`)
    if (tabId) tabManager.delete(tabId)
}

// update blocking lists on interval
setInterval(abpLists.updateLists, 30 * 60 * 1000)

// event listeners
// true for event capture. Deciding to enable capture was mostly trial/error.
// https://developer.apple.com/library/content/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
safari.application.addEventListener('activate', onActivate, true)
safari.application.addEventListener('message', handleMessage, true)
safari.application.addEventListener('beforeNavigate', onBeforeNavigation, true)
safari.application.addEventListener('navigate', onNavigate, false)
safari.application.addEventListener('beforeSearch', onBeforeSearch, false)
safari.application.addEventListener('close', onClose, false)

module.exports = {
    onStartup: onStartup
}
