import browser from 'webextension-polyfill'
import { registerMessageHandler } from '../message-handlers'

/**
 * @typedef {object} BurnConfig
 * @param {boolean} closeTabs
 * @param {boolean} clearHistory
 * @param {number} [since]
 */

export default class FireButton {
    constructor () {
        registerMessageHandler('doBurn', this.burn.bind(this))
    }

    /**
     * @returns {Promise<boolean>}
     */
    async burn (options) {
        const config = {
            closeTabs: true,
            clearHistory: true,
            newTabUrl: 'https://duckduckgo.com/chrome_newtab',
            since: Date.now() - (3600 * 1000)
        }
        console.log('🔥', config, options)
        if (config.closeTabs) {
            await this.closeAllTabs(config.newTabUrl)
        }
        // 1/ Clear downloads and history
        const clearCache = browser.browsingData.remove({
            since: config.since
        }, {
            downloads: true,
            history: config.clearHistory
        })
        // 2/ Clear cookies, except on SERP
        const clearCookies = chrome.browsingData.remove({
            excludeOrigins: ['https://duckduckgo.com'],
            since: config.since
        }, {
            cookies: true
        })
        // 3/ Clear origin-keyed storage
        const clearOriginKeyed = chrome.browsingData.remove({
            excludeOrigins: ['https://example.com'],
            since: config.since
        }, {
            appcache: true,
            cache: true,
            cacheStorage: true,
            indexedDB: true,
            fileSystems: true,
            localStorage: true,
            serviceWorkers: true,
            webSQL: true
        })
        try {
            const results = await Promise.all([clearCache, clearCookies, clearOriginKeyed])
            console.log('🔥 result', results)
            return true
        } catch (e) {
            console.warn('🔥 error', e)
            return false
        }
    }

    async closeAllTabs (newTabUrl) {
        // gather all non-pinned tabs
        const openTabs = await browser.tabs.query({
            pinned: false
        })
        const removeTabIds = openTabs.map(t => t.id || 0)
        // create a new tab which will be open after the burn
        await browser.tabs.create({
            active: true,
            url: newTabUrl
        })
        // remove the rest of the open tabs
        await browser.tabs.remove(removeTabIds)
    }
}
