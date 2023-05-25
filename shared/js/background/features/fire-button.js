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
        registerMessageHandler('getBurnOptions', this.getBurnOptions.bind(this))
    }

    /**
     * @returns {Promise<boolean>}
     */
    async burn (options) {
        const config = Object.assign({
            closeTabs: false,
            clearHistory: true,
            since: undefined
        }, options)

        console.log('🔥', config)
        if (config.closeTabs) {
            await this.closeAllTabs()
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

    async closeAllTabs () {
        // gather all non-pinned tabs
        const openTabs = await browser.tabs.query({
            pinned: false
        })
        const removeTabIds = openTabs.map(t => t.id || 0)
        // create a new tab which will be open after the burn
        await browser.tabs.create({
            active: true
        })
        // remove the rest of the open tabs
        await browser.tabs.remove(removeTabIds)
    }

    async getBurnOptions () {
        const ONE_HOUR = 60 * 60 * 1000
        const openTabs = (await browser.tabs.query({ pinned: false })).length
        const allCookies = await browser.cookies.getAll({})
        const cookies = allCookies.reduce((sites, curr) => {
            sites.add(curr.domain)
            return sites
        }, new Set()).size
        return [
            {
                name: 'Current site only',
                options: {
                    origins: []
                },
                description: {
                    history: 'current site',
                    openTabs,
                    cookies: 1
                }
            },
            {
                name: 'Last hour',
                options: {
                    since: Date.now() - ONE_HOUR
                },
                description: {
                    history: 'last hour',
                    openTabs,
                    cookies
                }
            },
            {
                name: 'Last day',
                options: {
                    since: Date.now() - (24 * ONE_HOUR)
                },
                description: {
                    history: 'last day',
                    openTabs,
                    cookies
                }
            },
            {
                name: 'Last 7 day',
                options: {
                    since: Date.now() - (7 * 24 * ONE_HOUR)
                },
                description: {
                    history: 'last 7 days',
                    openTabs,
                    cookies
                }
            },
            {
                name: 'Last 4 weeks',
                options: {
                    since: Date.now() - (4 * 7 * 24 * ONE_HOUR)
                },
                description: {
                    history: 'last 4 weeks',
                    openTabs,
                    cookies
                }
            },
            {
                name: 'All time',
                options: {},
                description: {
                    history: 'all',
                    openTabs,
                    cookies
                }
            },
        ]
    }
}
