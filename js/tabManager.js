class TabManager {
    constructor() {
        this.tabContainer = {}
    };

    /* This overwrites the current tab data for a given
     * id and is only called in three cases:
     * 1. When we rebuild saved tabs when the browser is restarted
     * 2. When a new tab is opened. See onUpdated listener below
     * 3. When we get a new main_frame request
     */
    create(tabData) {
        let newTab = new Tab(tabData);
        this.tabContainer[newTab.id] = newTab;
        return newTab;
    };

    delete(id) {
        delete this.tabContainer[id];
    };

    /* Called using either a chrome tab object or by id
     * get({tabId: ###});
     */
    get(tabData) {
        return this.tabContainer[tabData.tabId];
    };
}

var tabManager = new TabManager();

chrome.tabs.onRemoved.addListener( (id, info) => {
    // remove the tab object
    tabManager.delete(id);
});

/* This handles the new tab case. You have clicked to 
 * open a new tab and haven't typed in a url yet.
 * This will fire an onUpdated event and we can create
 * an intital tab instance here. We'll update this instance
 * later on when webrequests start coming in.
 */
chrome.tabs.onUpdated.addListener( (id, info) => {
    if (!tabManager.get({'tabId': id})) {
        info.id = id;
        tabManager.create(info);
    }
    else {
        let tab = tabManager.get({tabId: id});
        if (tab && info.status) {
            tab.status = info.status;
        
            // When the tab finishes loading:
            // 1. check main_frame url for http and update site score
            // 2. check for uncompleted upgraded https requests and whitlist the site if 
            // there are any
            if (tab.status === "complete") {

                if (tab.url.match(/^https:\/\//)) {
                    tab.site.score.update({hasHTTPS: true})
                }

                if (!tab.site.HTTPSwhitelisted && tab.httpsRequests.length) {
                    tab.site.setWhitelisted('HTTPSwhitelisted', true);
                    chrome.tabs.reload(tab.id);
                }

                console.info(tab.site.score);

                tab.updateBadgeIcon();
            }
        }
    }

});

// update tab url after the request is finished. This makes
// sure we have the correct url after any https rewrites
chrome.webRequest.onCompleted.addListener( (request) => {
    let tab = tabManager.get({tabId: request.tabId});
    if (tab) {
        tab.url = request.url;
        tab.updateSite();
    }
}, {urls: ['<all_urls>'], types: ['main_frame']});

