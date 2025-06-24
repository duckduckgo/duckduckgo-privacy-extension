const Companies = require('./companies');
const settings = require('./settings');
const Tab = require('./classes/tab');
const ServiceWorkerTab = require('./classes/sw-tab');
const { TabState } = require('./classes/tab-state');
const browserWrapper = require('./wrapper');
const { toggleUserAllowlistDomain, updateUserDenylist } = require('./dnr-user-allowlist.js');
const { clearClickToLoadDnrRulesForTab } = require('./dnr-click-to-load');
const { getCurrentTab } = require('./utils');

/**
 * @typedef {import('./classes/site.js').allowlistName} allowlistName
 */

/**
 * @typedef {import('./components/abn-experiments').default} AbnExperimentMetrics
 */

// These tab properties are preserved when a new tab Object replaces an existing
// one for the same tab ID.
const persistentTabProperties = ['ampUrl', 'cleanAmpUrl', 'dnrRuleIdsByDisabledClickToLoadRuleAction', 'userRefreshCount'];

class TabManager {
    constructor() {
        /** @type {Record<number, Tab>} */
        this.tabContainer = {};
        /** @type {Record<string, Tab>} */
        this.swContainer = {};
        /** @type {AbnExperimentMetrics=} */
        this.abnMetrics = globalThis.components?.abnMetrics;
    }

    /* This overwrites the current tab data for a given
     * id and is only called in three cases:
     * 1. When a new tab is opened. See onUpdated listener below
     * 2. When we get a new main_frame request
     */
    create(tabData) {
        const normalizedData = browserWrapper.normalizeTabData(tabData);
        const newTab = new Tab(normalizedData, this.abnMetrics);

        const oldTab = this.tabContainer[newTab.id];
        if (oldTab) {
            for (const property of persistentTabProperties) {
                newTab[property] = oldTab[property];
            }
            if (oldTab.adClick?.shouldPropagateAdClickForNavigation(oldTab)) {
                newTab.adClick = oldTab.adClick.clone();
            }
        }

        this.tabContainer[newTab.id] = newTab;
        return newTab;
    }

    async restoreOrCreate(tabData) {
        const restored = await this.restore(tabData.id);
        if (!restored) {
            await this.create(tabData);
        }
    }

    async restore(tabId) {
        const restoredState = await Tab.restore(tabId);
        if (restoredState) {
            this.tabContainer[tabId] = restoredState;
        }
        return restoredState;
    }

    delete(id) {
        const tabToRemove = this.tabContainer[id];
        if (tabToRemove) {
            tabToRemove?.adClick?.removeDNR();

            if (browserWrapper.getManifestVersion() === 3) {
                clearClickToLoadDnrRulesForTab(tabToRemove);
            }
        }
        delete this.tabContainer[id];
        TabState.delete(id);
    }

    has(id) {
        return id in this.tabContainer;
    }

    /**
     * Called using either a chrome tab object or by id
     * get({tabId: ###});
     * @returns {Tab}
     */
    get(tabData) {
        if (tabData.tabId === -1 && (tabData.initiator || tabData.documentUrl)) {
            // service worker request - use a 'ServiceWorkerTab' for the origin as a proxy for the real tab(s)
            const swUrl = tabData.initiator || tabData.documentUrl;
            const swOrigin = new URL(swUrl).origin;
            if (!this.swContainer[swOrigin]) {
                this.swContainer[swOrigin] = new ServiceWorkerTab(swUrl, this.tabContainer);
            }
            return this.swContainer[swOrigin];
        }
        return this.tabContainer[tabData.tabId];
    }

    async getOrRestoreTab(tabId) {
        if (!tabManager.has(tabId)) {
            await tabManager.restore(tabId);
        }
        return tabManager.get({ tabId });
    }

    /**
     * Return a Tab Object for the currently focused tab, if possible.
     *
     * @returns {Promise<import("./classes/tab")?>}
     */
    async getOrRestoreCurrentTab() {
        const currentTabDetails = await getCurrentTab();
        if (currentTabDetails?.id) {
            return await tabManager.getOrRestoreTab(currentTabDetails.id);
        }
        return null;
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
    async setList(data) {
        this.setGlobalAllowlist(data.list, data.domain, data.value);

        // collect all tabs (both normal and SW) tracked by this object
        const allTabs = [
            ...Object.keys(this.tabContainer).map((tabId) => this.tabContainer[tabId]),
            ...Object.keys(this.swContainer).map((origin) => this.swContainer[origin]),
        ];
        // propegate the list change to all tabs with the same site
        allTabs
            .filter((tab) => tab.site && tab.site.domain === data.domain)
            .forEach((tab) => {
                tab.site.setListValue(data.list, data.value);
            });

        // Ensure that user allowlisting/denylisting is honoured for manifest v3
        // builds of the extension, by adding/removing the necessary
        // declarativeNetRequest rules.
        if (browserWrapper.getManifestVersion() === 3) {
            if (data.list === 'allowlisted') {
                await toggleUserAllowlistDomain(data.domain, data.value);
            } else if (data.list === 'denylisted') {
                await updateUserDenylist();
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
    setGlobalAllowlist(list, domain, value) {
        const globalallowlist = settings.getSetting(list) || {};

        if (value) {
            globalallowlist[domain] = true;
        } else {
            delete globalallowlist[domain];
        }

        settings.updateSetting(list, globalallowlist);
    }

    /* This handles the new tab case. You have clicked to
     * open a new tab and haven't typed in a url yet.
     * This will fire an onUpdated event and we can create
     * an intital tab instance here. We'll update this instance
     * later on when webrequests start coming in.
     */
    createOrUpdateTab(id, info) {
        if (!tabManager.get({ tabId: id })) {
            info.id = id;
            return tabManager.create(info);
        } else {
            const tab = tabManager.get({ tabId: id });
            if (tab && info.status) {
                tab.status = info.status;

                /**
                 * Re: HTTPS. When the tab finishes loading:
                 * 1. check main_frame url (via tab.url) for http/s, update site grade
                 * 2. check for incomplete upgraded https upgrade requests, allowlist
                 * the entire site if there are any then notify tabManager
                 * NOTE: we aren't making a distinction between active and passive
                 * content when https content is mixed after a forced upgrade
                 */
                if (tab.status === 'complete') {
                    const hasHttps = !!(tab.url && tab.url.match(/^https:\/\//));
                    tab.site.grade.setHttps(hasHttps, hasHttps);

                    console.info(tab.site.grade);

                    if (tab.statusCode === 200 && !tab.site.didIncrementCompaniesData) {
                        if (tab.trackers && Object.keys(tab.trackers).length > 0) {
                            Companies.incrementTotalPagesWithTrackers();
                        }

                        Companies.incrementTotalPages();
                        tab.site.didIncrementCompaniesData = true;
                    }
                }
            }
            return tab;
        }
    }

    updateTabUrl(request) {
        // Update tab data. This makes
        // sure we have the correct url after any https rewrites
        const tab = tabManager.get({ tabId: request.tabId });

        if (tab) {
            tab.statusCode = request.statusCode;
            if (tab.statusCode === 200) {
                tab.updateSite(request.url);
            }
        }
    }
}

const tabManager = new TabManager();
module.exports = tabManager;
