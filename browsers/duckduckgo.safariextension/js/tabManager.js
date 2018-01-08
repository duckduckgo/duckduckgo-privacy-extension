class TabManager {
    constructor() {
        this.tabContainer = {}
    };

    getActiveTab () {
        let activeTab = safari.application.activeBrowserWindow.activeTab
        if (activeTab.ddgTabId) {
            return tabManager.get({tabId: activeTab.ddgTabId})
        } else {
            let id = tabManager.getTabId({target: activeTab})
            return tabManager.get({tabId: id})
        }   
    }

    // creates (if needed) a tabId for a given safari tab (e)
    getTabId (e) {
        if (e.target.ddgTabId) return e.target.ddgTabId

        for (let id in safari.application.activeBrowserWindow.tabs) {
            if (safari.application.activeBrowserWindow.tabs[id] === e.target) {
                let tabId = Math.floor(Math.random() * (1000 - 10 + 1)) + 10;
                safari.application.activeBrowserWindow.tabs[id].ddgTabId = tabId
                return tabId
            }
        }
    }

    /* This overwrites the current tab data for a given
     * id and is only called in three cases:
     * 1. When we rebuild saved tabs when the browser is restarted
     * 2. When a new tab is opened. See onUpdated listener below
     * 3. When we get a new main_frame request
     */
    create(tabData) {
        console.log(`CREATE TAB: ${tabData.url}`)
        let createTabData = {url: tabData.message.currentURL, id: tabManager.getTabId(tabData)}
        createTabData.target = tabData.target
        
        console.log(createTabData)

        let newTab = new Tab(createTabData);
        this.tabContainer[newTab.id] = newTab;
        return newTab;
    };

    delete(id) {
        console.log(`DELETE TAB ${id}`)
        delete this.tabContainer[id];
    };

    /* Called using either a chrome tab object or by id
     * get({tabId: ###});
     */
    get(tabData) {
        return this.tabContainer[tabData.tabId];
    };

    /* This will whitelist any open tabs with the same domain
     * list: name of the whitelist to update
     * domain: domain to whitelist
     * value: whitelist value, true or false
     */
    whitelistDomain(data) {
        this.setGlobalWhitelist(data.list, data.domain, data.value)
        
        for (let tabId in this.tabContainer) {
            let tab = this.tabContainer[tabId];
            if (tab.site && tab.site.domain === data.domain) {
                tab.site.setWhitelisted(data.list, data.value)
            }
        }

    }

    /* Update the whitelists kept in settings
     */
    setGlobalWhitelist(list, domain, value) {
        let globalwhitelist = settings.getSetting(list) || {}

        if (value) {
            globalwhitelist[domain] = true
        }
        else {
            delete globalwhitelist[domain]
        }

        settings.updateSetting(list, globalwhitelist)
    }

    reloadTab () {
        var activeTab = safari.application.activeBrowserWindow.activeTab;
        activeTab.url = activeTab.url
    }

}

var tabManager = new TabManager();

var closeHandler = function (e) {
    let tabId = tabManager.getTabId(e)
    if (tabId) tabManager.delete(tabId)
}

safari.application.addEventListener("close", closeHandler, true);

// update tab url after the request is finished. This makes
// sure we have the correct url after any https rewrites
safari.application.addEventListener('message', ( (request) => {

    if (request.name === 'unloadTab') {
        closeHandler(request)
    }
    else if (request.name === 'tabLoaded') {
        let tab = tabManager.get({tabId: request.target.ddgTabId})
        
        if (tab) {
            
            // update site https status. We should move this out 
            if (request.message.mainFrameURL && request.message.mainFrameURL.match(/^https:\/\//)) {
                tab.site.score.update({hasHTTPS: true})
            }

            tab.updateBadgeIcon(request.target)
            if (!tab.site.didIncrementCompaniesData) {
                Companies.incrementTotalPages()
                tab.site.didIncrementCompaniesData = true
                
                if (tab.trackers && Object.keys(tab.trackers).length > 0) {
                    Companies.incrementTotalPagesWithTrackers()
                }

            }

            // stash data in safari tab to handle cached pages
            if(!request.target.ddgCache) request.target.ddgCache = {}
            request.target.ddgCache[tab.url] = tab
        }
        else {
            utils.setBadgeIcon('img/ddg-icon.png', request.target)
        }
        
    }
    else if (request.name === 'whitelisted') {
        tabManager.whitelistDomain(request.message.whitelisted)
    }
}), true);

// update the popup when switching browser windows
safari.application.addEventListener('activate', ((e) => {
    let activeTab = tabManager.getActiveTab()
    if (activeTab) {
        activeTab.updateBadgeIcon(e.target)
    }
}), true)

safari.application.addEventListener('beforeSearch', (e) => {
    if (e.target && e.target.ddgTabId) {
        tabManager.delete(e.target.ddgTabId)
    }
}, false)

// rebuild cached tabs
safari.application.addEventListener('navigate', ((e) => {
    let tabId = e.target.ddgTabId
    let tab = tabManager.get({tabId: tabId})

    // if we don't have a tab with this tabId then we are in a cached page
    // use the target url to find the correct cached tab obj
    if (!tab) {
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
}))
