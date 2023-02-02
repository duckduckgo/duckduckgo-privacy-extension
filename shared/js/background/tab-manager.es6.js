const Companies = require('./companies.es6')
const settings = require('./settings.es6')
const Tab = require('./classes/tab.es6')
const { TabState } = require('./classes/tab-state')
const browserWrapper = require('./wrapper.es6')
const {
    toggleUserAllowlistDomain,
    updateUserDenylist
} = require('./declarative-net-request.js')

/**
 * @typedef {import('./classes/site.es6.js').allowlistName} allowlistName
 */

class TabManager {
    constructor () {
        /** @type {Record<number, Tab>} */
        this.tabContainer = {}
    }

    /* This overwrites the current tab data for a given
     * id and is only called in three cases:
     * 1. When a new tab is opened. See onUpdated listener below
     * 2. When we get a new main_frame request
     */
    create (tabData) {
        const normalizedData = browserWrapper.normalizeTabData(tabData)
        const newTab = new Tab(normalizedData)

        const oldTab = this.tabContainer[newTab.id]
        if (oldTab) {
            newTab.ampUrl = oldTab.ampUrl
            newTab.cleanAmpUrl = oldTab.cleanAmpUrl
            if (oldTab.adClick?.shouldPropagateAdClickForNavigation(oldTab)) {
                newTab.adClick = oldTab.adClick.clone()
            }
        }

        this.tabContainer[newTab.id] = newTab
        return newTab
    }

    async restoreOrCreate (tabData) {
        const restored = await this.restore(tabData.id)
        if (!restored) {
            await this.create(tabData)
        }
    }

    async restore (tabId) {
        const restoredState = await Tab.restore(tabId)
        if (restoredState) {
            this.tabContainer[tabId] = restoredState
        }
        return restoredState
    }

    delete (id) {
        this.tabContainer[id]?.adClick?.removeDNR()
        delete this.tabContainer[id]
        TabState.delete(id)
    }

    has (id) {
        return id in this.tabContainer
    }

    /**
     * Called using either a chrome tab object or by id
     * get({tabId: ###});
     * @returns {Tab}
     */
    get (tabData) {
        if (tabData.tabId === -1 && (tabData.initiator || tabData.documentUrl)) {
            // service worker request - try to find a tab that matches this initiator
            const swOrigin = new URL(tabData.initiator || tabData.documentUrl).origin
            const matchingTabs = this._findTabsMatchingOrigin(swOrigin)
            if (matchingTabs.length > 0) {
                return this.tabContainer[matchingTabs[0]]
            }
            return this.create({
                tabId: -1,
                url: tabData.initiator
            })
        }
        return this.tabContainer[tabData.tabId]
    }

    _findTabsMatchingOrigin (origin) {
        return Object.keys(this.tabContainer).filter(tabId => {
            const tab = this.tabContainer[tabId]
            try {
                return Number(tabId) > -1 && new URL(tab.url).origin === origin
            } catch (e) {
                // URL can throw on invalid URL
                return false
            }
        })
    }

    async getOrRestoreTab (tabId) {
        if (!tabManager.has(tabId)) {
            await tabManager.restore(tabId)
        }
        return tabManager.get({ tabId })
    }

    /**
     * This will allowlist any open tabs with the same domain
     *
     * @param {object} data
     * @param {allowlistName} data.list - name of the allowlist to update
     * @param {string} data.domain - domain to allowlist
     * @param {boolean} data.value - allowlist value, true or false
     * @return {Promise}
     */
    async setList (data) {
        this.setGlobalAllowlist(data.list, data.domain, data.value)

        for (const tabId in this.tabContainer) {
            const tab = this.tabContainer[tabId]
            if (tab.site && tab.site.domain === data.domain) {
                tab.site.setListValue(data.list, data.value)
            }
        }

        // Ensure that user allowlisting/denylisting is honoured for manifest v3
        // builds of the extension, by adding/removing the necessary
        // declarativeNetRequest rules.
        if (browserWrapper.getManifestVersion() === 3) {
            if (data.list === 'allowlisted') {
                await toggleUserAllowlistDomain(data.domain, data.value)
            } else if (data.list === 'denylisted') {
                await updateUserDenylist()
            }
        }
    }

    /**
     * Update the allowlists kept in settings
     *
     * @param {allowlistName} list
     * @param {string} domain
     * @param {boolean} value
     */
    setGlobalAllowlist (list, domain, value) {
        const globalallowlist = settings.getSetting(list) || {}

        if (value) {
            globalallowlist[domain] = true
        } else {
            delete globalallowlist[domain]
        }

        settings.updateSetting(list, globalallowlist)
    }

    /* This handles the new tab case. You have clicked to
     * open a new tab and haven't typed in a url yet.
     * This will fire an onUpdated event and we can create
     * an intital tab instance here. We'll update this instance
     * later on when webrequests start coming in.
     */
    createOrUpdateTab (id, info) {
        if (!tabManager.get({ tabId: id })) {
            info.id = id
            return tabManager.create(info)
        } else {
            const tab = tabManager.get({ tabId: id })
            if (tab && info.status) {
                tab.status = info.status

                /**
                 * Re: HTTPS. When the tab finishes loading:
                 * 1. check main_frame url (via tab.url) for http/s, update site grade
                 * 2. check for incomplete upgraded https upgrade requests, allowlist
                 * the entire site if there are any then notify tabManager
                 * NOTE: we aren't making a distinction between active and passive
                 * content when https content is mixed after a forced upgrade
                 */
                if (tab.status === 'complete') {
                    const hasHttps = !!(tab.url && tab.url.match(/^https:\/\//))
                    tab.site.grade.setHttps(hasHttps, hasHttps)

                    console.info(tab.site.grade)

                    if (tab.statusCode === 200 &&
                        !tab.site.didIncrementCompaniesData) {
                        if (tab.trackers && Object.keys(tab.trackers).length > 0) {
                            Companies.incrementTotalPagesWithTrackers()
                        }

                        Companies.incrementTotalPages()
                        tab.site.didIncrementCompaniesData = true
                    }
                }
            }
            return tab
        }
    }

    updateTabUrl (request) {
        // Update tab data. This makes
        // sure we have the correct url after any https rewrites
        const tab = tabManager.get({ tabId: request.tabId })

        if (tab) {
            tab.statusCode = request.statusCode
            if (tab.statusCode === 200) {
                tab.updateSite(request.url)
            }
        }
    }
}

const tabManager = new TabManager()

module.exports = tabManager
