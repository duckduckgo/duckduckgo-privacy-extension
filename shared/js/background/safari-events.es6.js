const ATB = require('./atb.js')
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
            
        let message.tabId = tabManager.getTabId(message)
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

safari.application.addEventListener("message", handleMessage, true);
//safari.application.addEventListener("beforeNavigate", onBeforeNavigation, true);
//safari.application.addEventListener('beforeSearch', onBeforeSearch, true);
