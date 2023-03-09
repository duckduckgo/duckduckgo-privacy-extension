import browser from 'webextension-polyfill'
import tabManager from '../tab-manager'
import Companies from '../companies'

export default {
    init: async () => {
        const createdTargets = new Map()
        // init from current open tabs
        const savedTabs = await browser.tabs.query({ status: 'complete' })
        for (let i = 0; i < savedTabs.length; i++) {
            const tab = savedTabs[i]

            if (tab.url) {
                // On reinstall we wish to create the tab again
                await tabManager.restoreOrCreate(tab)
            }
        }
        if (browser.webNavigation.onCreatedNavigationTarget) {
            browser.webNavigation.onCreatedNavigationTarget.addListener((details) => {
                createdTargets.set(details.tabId, details.sourceTabId)
            })
        }
        browser.webNavigation.onBeforeNavigate.addListener((details) => {
            console.log('navigation', details.tabId, details.frameId, details.url)
            // ignore navigation on iframes
            if (details.frameId !== 0) return

            const currentTab = tabManager.get({ tabId: details.tabId })
            const newTab = tabManager.create({
                tabId: details.tabId,
                url: details.url
            })

            // persist the last URL the tab was trying to upgrade to HTTPS
            if (currentTab && currentTab.httpsRedirects) {
                newTab.httpsRedirects.persistMainFrameRedirect(
                    currentTab.httpsRedirects.getMainFrameRedirect()
                )
            }
            if (createdTargets.has(details.tabId)) {
                const sourceTabId = createdTargets.get(details.tabId)
                createdTargets.delete(details.tabId)

                const sourceTab = tabManager.get({ tabId: sourceTabId })
                if (sourceTab && sourceTab.adClick) {
                    createdTargets.set(details.tabId, sourceTabId)
                    if (sourceTab.adClick.shouldPropagateAdClickForNewTab(newTab)) {
                        newTab.adClick = sourceTab.adClick.propagate(newTab.id)
                    }
                }
            }
            newTab.updateSite(details.url)
        // devtools.postMessage(details.tabId, 'tabChange', devtools.serializeTab(newTab))
        })

        browser.tabs.onCreated.addListener((info) => {
            if (info.id) {
                console.log('tabs.onCreated', info.id, info.url)
                tabManager.createOrUpdateTab(info.id, info)
            }
        })

        browser.tabs.onUpdated.addListener((id, info) => {
            // sync company data to storage when a tab finishes loading
            if (info.status === 'complete') {
                Companies.syncToStorage()
            }
            if (info.url) {
                console.log('tabs.onUpdated', id, info.url)
                tabManager.createOrUpdateTab(id, info)
            }
        })

        browser.tabs.onRemoved.addListener((id, info) => {
        // remove the tab object
            tabManager.delete(id)
        })

        Companies.buildFromStorage()
        return tabManager
    }
}
