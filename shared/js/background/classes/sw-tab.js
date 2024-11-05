const Tab = require('./tab');

/**
 * A stub tab implementation for service workers.
 *
 * For most actions, this just mimics a tab with the service worker URL as the tab URL. However, for cases
 * such as tracker counts, it distributes stats to all known tabs with the same origin.
 */
class ServiceWorkerTab extends Tab {
    /**
     * @param {string} swUrl
     * @param {Record<number, Tab>} tabContainer
     */
    constructor(swUrl, tabContainer) {
        super({
            tabId: -1,
            url: swUrl,
            status: null,
        });
        this.origin = new URL(swUrl).origin;
        this.tabContainer = tabContainer;
    }

    /**
     * Find the list of tabs which share the same origin as this service worker.
     * @returns {Tab[]}
     */
    _findMatchingTabs() {
        // Iterate all tabs to find matching origins.
        // In future we may want to consider caching this data to avoid O(n) cost per request
        return Object.keys(this.tabContainer)
            .filter((tabId) => {
                const tab = this.tabContainer[tabId];
                try {
                    return Number(tabId) > -1 && new URL(tab.url).origin === this.origin;
                } catch (e) {
                    // URL can throw on invalid URL
                    return false;
                }
            })
            .map((k) => this.tabContainer[k]);
    }

    /**
     * @param t
     * @param {string} baseDomain
     * @param {string} url
     * @returns {import('./tracker').Tracker}
     */
    addToTrackers(tracker, baseDomain, url) {
        const results = this._findMatchingTabs().map((tab) => tab.addToTrackers(tracker, baseDomain, url));
        return results[0];
    }

    /**
     * Post a message to the devtools panel for all matching
     * @param {Object} devtools
     * @param {string} action
     * @param {Object} message
     */
    postDevtoolsMessage(devtools, action, message) {
        this._findMatchingTabs().forEach((tab) => tab.postDevtoolsMessage(devtools, action, message));
    }
}

module.exports = ServiceWorkerTab;
