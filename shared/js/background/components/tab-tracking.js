/* global BUILD_TARGET */
import browser from 'webextension-polyfill';
import { restoreDefaultClickToLoadRuleActions } from '../dnr-click-to-load';
import Companies from '../companies';
import { isRedirect } from '../utils';

/**
 * @typedef {import('./devtools').default} Devtools
 * @typedef {import('../tab-manager.js')} TabManager
 */

export default class TabTracker extends EventTarget {
    /**
     * @param {{
     *  tabManager: TabManager;
     *  devtools: Devtools;
     * }} options
     */
    constructor({ tabManager, devtools }) {
        super()
        this.tabManager = tabManager;
        this.createdTargets = new Map();

        browser.webRequest.onHeadersReceived.addListener(
            (request) => {
                this.tabManager.updateTabUrl(request);
                const tab = tabManager.get({ tabId: request.tabId });

                tab.httpErrorCodes.push(request.statusCode);

                // SERP ad click detection
                if (isRedirect(request.statusCode)) {
                    tab.setAdClickIfValidRedirect(request.url);
                } else if (tab && tab.adClick && !isRedirect(request.statusCode)) {
                    // At the end of the redirect chain, ensure the final URL's base
                    // domain (aka the "heuristic" base domain) is noted for the
                    // 'm_ad_click_detected' pixel.
                    let heuristicAdBaseDomain = null;
                    if (tab.adClick.heuristicDetectionEnabled) {
                        heuristicAdBaseDomain = tab.site.baseDomain || '';

                        // No parameter domain was provided by the SERP, so fall
                        // back to the heuristic domain for the ad click.
                        if (tab.adClick.adClickRedirect) {
                            tab.adClick.setAdBaseDomain(heuristicAdBaseDomain);
                        }
                    }

                    tab.adClick.sendAdClickDetectedPixel(heuristicAdBaseDomain);
                }
            },
            { urls: ['<all_urls>'], types: ['main_frame'] },
        );

        // Store the created tab id for when onBeforeNavigate is called so data can be copied across from the source tab
        browser.webNavigation.onCreatedNavigationTarget.addListener((details) => {
            this.createdTargets.set(details.tabId, details.sourceTabId);
        });

        // keep track of URLs that the browser navigates to.
        //
        // this is supplemented by tabManager.updateTabUrl() on headersReceived:
        // tabManager.updateTabUrl only fires when a tab has finished loading with a 200,
        // which misses a couple of edge cases like browser special pages
        // and Gmail's weird redirect which returns a 200 via a service worker
        browser.webNavigation.onBeforeNavigate.addListener((details) => {
            // ignore navigation on iframes
            if (details.frameId !== 0) return;

            const currentTab = tabManager.get({ tabId: details.tabId });
            const newTab = tabManager.create({ tabId: details.tabId, url: details.url });
            if (currentTab && currentTab.site.url === details.url) {
                this.dispatchEvent(new CustomEvent('tabRefresh', { detail: details }))
            }

            if (BUILD_TARGET === 'chrome') {
                // Ensure that the correct declarativeNetRequest allowing rules are
                // added for this tab.
                // Note: The webNavigation.onBeforeCommitted event would be better,
                //       since onBeforeNavigate can be fired for a navigation that is
                //       not later committed. But since there is a race-condition
                //       between the page loading and the rules being added, let's use
                //       onBeforeNavigate for now as it fires sooner.
                restoreDefaultClickToLoadRuleActions(newTab);
            }

            // persist the last URL the tab was trying to upgrade to HTTPS
            if (currentTab && currentTab.httpsRedirects) {
                newTab.httpsRedirects.persistMainFrameRedirect(currentTab.httpsRedirects.getMainFrameRedirect());
            }
            if (this.createdTargets.has(details.tabId)) {
                const sourceTabId = this.createdTargets.get(details.tabId);
                this.createdTargets.delete(details.tabId);

                const sourceTab = tabManager.get({ tabId: sourceTabId });
                if (sourceTab && sourceTab.adClick) {
                    this.createdTargets.set(details.tabId, sourceTabId);
                    if (sourceTab.adClick.shouldPropagateAdClickForNewTab(newTab)) {
                        newTab.adClick = sourceTab.adClick.propagate(newTab.id);
                    }
                }
            }

            newTab.updateSite(details.url);
            devtools.postMessage(details.tabId, 'tabChange', devtools.serializeTab(newTab));
        });

        browser.tabs.onCreated.addListener((info) => {
            if (info.id) {
                tabManager.createOrUpdateTab(info.id, info);
            }
        });

        browser.tabs.onUpdated.addListener((id, info) => {
            // sync company data to storage when a tab finishes loading
            if (info.status === 'complete') {
                Companies.syncToStorage();
            }
            tabManager.createOrUpdateTab(id, info);
        });

        browser.tabs.onRemoved.addListener((id, info) => {
            // remove the tab object
            tabManager.delete(id);
        });

        this.restoreOrCreateTabs();
    }

    async restoreOrCreateTabs() {
        const savedTabs = await browser.tabs.query({ status: 'complete' });
        for (let i = 0; i < savedTabs.length; i++) {
            const tab = savedTabs[i];

            if (tab.url) {
                // On reinstall we wish to create the tab again
                await this.tabManager.restoreOrCreate(tab);
            }
        }
    }
}
