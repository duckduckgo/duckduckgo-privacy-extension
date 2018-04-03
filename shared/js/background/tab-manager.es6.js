const Companies = require('./companies.es6')
const settings = require('./settings.es6')
const Tab = require('./classes/tab.es6')
const utils = require('./utils.es6')
let browser = utils.parseUserAgentString()

class TabManager {
    constructor() {
        this.tabContainer = {}
    };

    /* Safari getActiveTab */
    getActiveTab () {
        let activeTab = safari.application.activeBrowserWindow.activeTab
        if (activeTab.ddgTabId) {
            return tabManager.get({tabId: activeTab.ddgTabId})
        } else {
            let id = tabManager.getTabId({target: activeTab})
            return tabManager.get({tabId: id})
        }   
    }

    /* Safari getTabId */
    getTabId (e) {
        if (e.target.ddgTabId) return e.target.ddgTabId

        for (let id in safari.application.activeBrowserWindow.tabs) {
            if (safari.application.activeBrowserWindow.tabs[id] === e.target) {
                let tabId = Math.floor(Math.random() * (100000 - 10 + 1)) + 10;
                safari.application.activeBrowserWindow.tabs[id].ddgTabId = tabId
                return tabId
            }
        }
    }

    reloadTab() {
        var activeTab = safari.application.activeBrowserWindow.activeTab;activeTab.url = activeTab.url
        activeTab.url = activeTab.url
    }

    /* This overwrites the current tab data for a given
     * id and is only called in three cases:
     * 1. When we rebuild saved tabs when the browser is restarted
     * 2. When a new tab is opened. See onUpdated listener below
     * 3. When we get a new main_frame request
     */
    create(tabData) {

        if (browser === 'Safari') {
            let url = tabData.message ? tabData.message.currentURL : tabData.url
            let createTabData = {url: url, id: tabManager.getTabId(tabData)}
            createTabData.target = tabData.target
        }

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

        chrome.runtime.sendMessage({whitelistChanged: true});
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

    /* This handles the new tab case. You have clicked to
     * open a new tab and haven't typed in a url yet.
     * This will fire an onUpdated event and we can create
     * an intital tab instance here. We'll update this instance
     * later on when webrequests start coming in.
     */
    createOrUpdateTab(id, info) {
        if (!tabManager.get({'tabId': id})) {
            info.id = id;
            tabManager.create(info);
        }
        else {
            let tab = tabManager.get({tabId: id});
            if (tab && info.status) {
                tab.status = info.status;

                /**
                 * Re: HTTPS. When the tab finishes loading:
                 * 1. check main_frame url (via tab.url) for http/s, update site score
                 * 2. check for incomplete upgraded https upgrade requests, whitelist
                 * the entire site if there are any then notify tabManager
                 * NOTE: we aren't making a distinction between active and passive
                 * content when https content is mixed after a forced upgrade
                 */
                if (tab.status === 'complete') {
                    if (tab.url && tab.url.match(/^https:\/\//)) {
                        tab.site.score.update({hasHTTPS: true})
                    }
                    tab.checkHttpsRequestsOnComplete()
                    console.info(tab.site.score)
                    tab.updateBadgeIcon()

                    if (tab.statusCode === 200 &&
                        !tab.site.didIncrementCompaniesData) {

                        if (tab.trackers && Object.keys(tab.trackers).length > 0) {
                            Companies.incrementTotalPagesWithTrackers()
                        }

                        Companies.incrementTotalPages()
                        tab.site.didIncrementCompaniesData = true
                    }

                    if (tab.statusCode === 200) tab.endStopwatch()
                }
            }
        }

    }

    updateTabUrl(request) {
        // Update tab data. This makes
        // sure we have the correct url after any https rewrites
        let tab = tabManager.get({tabId: request.tabId})

        if (tab) {
            tab.statusCode = request.statusCode
            if (tab.statusCode === 200) {
                tab.url = request.url
                tab.updateSite()
            }
        }
    }

    updateTabRedirectCount(request) {
        // count redirects
        let tab = tabManager.get({'tabId': request.tabId})
        if (!tab) return

        if (tab.httpsRedirects[request.requestId]) {
            tab.httpsRedirects[request.requestId] += 1
        } else {
            tab.httpsRedirects[request.requestId] = 1
        }
    }
}

var tabManager = new TabManager();

module.exports = tabManager
