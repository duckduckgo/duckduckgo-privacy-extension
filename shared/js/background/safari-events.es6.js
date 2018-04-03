const ATB = require('./atb.es6')
const tabManager = require('./tab-manager.es6')

/** onStartup
 * Safari doesn't have a onInstalled event so we'll set a flag in localStorage.
 * 1. check installed flag
 * 2. go through all current tabs and recreate our own internal tab objects
 * 3. open post install page only if we're on a DDG page or Safari gallery page
 */
let onStartup = (() => {
    if (!localStorage['installed']) {
        localStorage['installed'] = true
        ATB.onInstalled()
    }
    
    // show post install page
    let activeTabIndex = 0
    let showPostinstallPage = false
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
        // we'll open the post install page in a new tab but keep the current tab active. To do this
        // we need to open a tab then reset the active tab
        let activeTabIdx = utils.getSafariTabIndex(safari.application.activeBrowserWindow.activeTab)
        safari.application.activeBrowserWindow.openTab().url = 'https://duckduckgo.com/app?post=1'
            
        // reactive the previous tab
        safari.application.activeBrowserWindow.tabs[activeTabIdx].activate()
    }
})

const redirect = require('./redirect.es6')

// Messaging
// canLoad => request data from content script. Runs onBeforeRequest
let handleMessage = ((message) => {
    if (message.name === 'canLoad') {

        let potentialTracker = requestData.message.potentialTracker
        let currentURL = requestData.message.mainFrameURL

        if (!(currentURL && potentialTracker)) return
            
        message.tabId = tabManager.getTabId(message)
        let thisTab = tabManager.get({tabId: tabId})
        let isMainFrame = requestData.message.frame === 'main_frame'
        
        // if it's preloading a site in the background and the url changes, delete and recreate the tab
        if (thisTab && thisTab.url !== message.message.mainFrameURL) {
            tabManager.delete(tabId)
            thisTab = tabManager.create({
                url: message.message.mainFrameURL,
                target: messaeg.target
            })
            console.log('onBeforeRequest DELETED AND RECREATED TAB because of url change:', thisTab)
        }

        if (!thisTab && isMainFrame) {
            tabManager.create(requestData)
            console.log('onBeforeRequest CREATED TAB:', thisTab)
        }

        return redirect.handleRequest(message)
    }
})

// update the popup when switching browser windows
let onActivate = ((e) => {
    let activeTab = tabManager.getActiveTab()
    if (activeTab) {
        activeTab.updateBadgeIcon(e.target)
    }
    // if we don't have an active tab then this is likely a new tab
    // this can happen when you open a new tab, click to activate another existing tab,
    // and then go back to the new tab. new tab -> existing tab -> back to new tab.
    // reset the badge to default and reload the popup to get the correct new tab data
    else {
        utils.setBadgeIcon('img/ddg-icon.png', e.target)
        safari.extension.popovers[0].contentWindow.location.reload()
    }
})

let onBeforeSearch = ((e) => {
    if (e.target && e.target.ddgTabId) {
        tabManager.delete(e.target.ddgTabId)
    }
})

// called when a page has successfully loaded:
let onNavigate = ((e) => {
    let tabId = e.target.ddgTabId
    let tab = tabManager.get({tabId: tabId})
        
    if (tab) {
        // update site https status. We should move this out 
        if (tab.url.match(/^https:\/\//)) {
            tab.site.score.update({hasHTTPS: true})
        }

        tab.updateBadgeIcon(e.target)
        if (!tab.site.didIncrementCompaniesData) {
            Companies.incrementTotalPages()
            tab.site.didIncrementCompaniesData = true
            
            if (tab.trackers && Object.keys(tab.trackers).length > 0) {
                Companies.incrementTotalPagesWithTrackers()
            }
        }

        // stash data in safari tab to handle cached pages
        if(!e.target.ddgCache) e.target.ddgCache = {}
        e.target.ddgCache[tab.url] = tab

        // after the page successfully loads, clear
        // out the https redirect cache so we don't prevent
        // subsequent pageloads from being upgraded:
        delete e.target.ddgHttpsRedirects
    }
    else {
        utils.setBadgeIcon('img/ddg-icon.png', e.target)

        // if we don't have a tab with this tabId then we are in a cached page
        // use the target url to find the correct cached tab obj
        console.log("REBUILDING CACHED TAB")
        if (e.target.ddgCache) {
            let cachedTab = e.target.ddgCache[e.target.url]
            if (cachedTab) {
                tabManager.tabContainer[tabId] = cachedTab
                safari.extension.popovers[0].contentWindow.location.reload()
                cachedTab.updateBadgeIcon(e.target)
            }
        }
    }
})

safari.application.addEventListener("activate", onActivate, true)
safari.application.addEventListener("message", handleMessage, true)
safari.application.addEventListener("beforeNavigate", onBeforeNavigation, true)
safari.application.addEventListener("navigate", onNavigate, true)
safari.application.addEventListener('beforeSearch', onBeforeSearch, true);
