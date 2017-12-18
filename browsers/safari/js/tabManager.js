class TabManager {
    constructor() {
        this.tabContainer = {}
    };

    getActiveTab () {

        let active = safari.application.activeBrowserWindow.activeTab
        console.log(active)
        if (active.ddgTabId) {
            return tabManager.get({tabId: active.ddgTabId})
        } else {
            let id = tabManager.getTabId({target: active})
            return tabManager.get({tabId: id})
        }   
    }
    // send safari event, get tab id
    getTabId (e) {
        if (e.target.ddgTabId) return e.target.ddgTabId

        for (let id in safari.application.activeBrowserWindow.tabs) {
            if (safari.application.activeBrowserWindow.tabs[id] === e.target) {
                // also add the id to this safari tab
                safari.application.activeBrowserWindow.tabs[id].ddgTabId = id
                return id
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

/*
chrome.tabs.onRemoved.addListener( (id, info) => {
    // remove the tab object
    tabManager.delete(id);
});
*/

var closeHandler = function (e) {
    let tabId = tabManager.getTabId(e)
    if (tabId) tabManager.delete(tabId)
    //updateTabBadge(e, 0)
}

safari.application.addEventListener("close", closeHandler, true);

/* This handles the new tab case. You have clicked to 
 * open a new tab and haven't typed in a url yet.
 * This will fire an onUpdated event and we can create
 * an intital tab instance here. We'll update this instance
 * later on when webrequests start coming in.
 */
/*
safari.application.addEventListener('open', ( (tabEvent) => {
    if (!tabManager.get({'tabId': tabEvent.url})) {
        // adapt safari tabevent data to work with tabManager.create
        // safari doesn't have unique IDs for each tab so we'll use the url for now
        let createData = {id: tabEvent.url, url: tabEvent.url, requestId: 0, status: 'complete'}

        tabManager.create(info);
    }
    else {
        let tab = tabManager.get({tabId: id});
        if (tab && info.status) {
            tab.status = info.status;

            if (tab.status === 'complete') {

                if (tab.url.match(/^https:\/\//)) {
                    tab.site.score.update({hasHTTPS: true})
                }
                tab.checkHttpsRequestsOnComplete()
                console.info(tab.site.score);
                tab.updateBadgeIcon();
            } 
        }
    }

}), true);
*/
/*
chrome.runtime.onMessage.addListener( (req, sender, res) => {
    if (req.whitelisted) {
        tabManager.whitelistDomain(req.whitelisted)
        chrome.runtime.sendMessage({whitelistChanged: true});
    }
    else if (req.getTab) {
        res(tabManager.get({'tabId': req.getTab}))
    }
    else if (req.getSiteScore) {
        let tab = tabManager.get({tabId: req.getSiteScore})
        res(tab.site.score.get())
    }
    return true;
});
*/

function getDuplicateTabCount (tabs, url) {
    let count = 0
    tabs.forEach((tab) => {
        if(tab.url === url) {
            count += 1
        }
    })
    return count
}

// update tab url after the request is finished. This makes
// sure we have the correct url after any https rewrites
safari.application.addEventListener('message', ( (request) => {

    if (request.name === 'unloadTab') {
        closeHandler(request)
    }
    else if (request.name === 'tabLoaded') {
        updateTabBadge(request)

        let tab = tabManager.get({tabId: request.target.ddgTabId})
        
        // update site https status. We should move this out 
        if (request.message.mainFrameURL && request.message.mainFrameURL.match(/^https:\/\//)) {
            tab.site.score.update({hasHTTPS: true})
        }

        if (tab) {
            tab.updateBadgeIcon()
        }
        else {
            safari.extension.toolbarItems[0].image = safari.extension.baseURI + 'img/ddg-icon.png'
        }
        
    }
    else if (request.name === 'whitelisted') {
        tabManager.whitelistDomain(request.message.whitelisted)
    }
    /*
    let tab = tabManager.get({tabId: request.tabId});
    if (tab) {
        tab.url = request.url;
        tab.updateSite();
        Companies.incrementPages();
    }
    */
}), true);


// temp hack to show site score as badge icon number
var updateTabBadge = function(e, val) {
    let tabId = tabManager.getTabId(e)
    console.log(`UPDATE BADGE: ${e.target.ddgTabId}`)

    if (val === 0) {
        safari.extension.toolbarItems[0].badge = val
    }
    else {
        let map = {A: 1, B: 2, C: 3, D: 4}
        let tab = tabManager.get({tabId: e.target.ddgTabId})

        console.log("UPDATE BADGE FOR TAB")
        console.log(tab)

        if (!tab) {
            safari.extension.toolbarItems[0].badge = 0
                return
        }
        console.log(`GRADE: ${tab.site.score.get()}`)

        tab.updateBadgeIcon()
        safari.extension.popovers[0].contentWindow.location.reload()
    }
}

safari.application.addEventListener('beforeSearch', (e) => {
    if (e.target && e.target.ddgTabId) {
        tabManager.delete(e.target.ddgTabId)
    }
}, false)


