import Companies from './companies.es6'
import settings from './settings.es6'
import Tab from './classes/tab.es6'
import browserWrapper from './wrapper.es6'

class TabManager {
    constructor () {
        this.tabContainer = {}
    };

    /* This overwrites the current tab data for a given
     * id and is only called in three cases:
     * 1. When we rebuild saved tabs when the browser is restarted
     * 2. When a new tab is opened. See onUpdated listener below
     * 3. When we get a new main_frame request
     */
    create (tabData) {
        const normalizedData = browserWrapper.normalizeTabData(tabData)
        const newTab = new Tab(normalizedData)
        this.tabContainer[newTab.id] = newTab
        return newTab
    };

    delete (id) {
        delete this.tabContainer[id]
    };

    /* Called using either a chrome tab object or by id
     * get({tabId: ###});
     */
    get (tabData) {
        return this.tabContainer[tabData.tabId]
    };

    /* This will allowlist any open tabs with the same domain
     * list: name of the allowlist to update
     * domain: domain to allowlist
     * value: allowlist value, true or false
     */
    setList (data) {
        this.setGlobalAllowlist(data.list, data.domain, data.value)

        for (const tabId in this.tabContainer) {
            const tab = this.tabContainer[tabId]
            if (tab.site && tab.site.domain === data.domain) {
                tab.site.setListValue(data.list, data.value)
            }
        }

        browserWrapper.notifyPopup({ allowlistChanged: true })
    }

    /* Update the allowlists kept in settings
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
            tabManager.create(info)
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

export default tabManager
