import { getFromSessionStorage, setToSessionStorage, removeFromSessionStorage } from '../wrapper'
import { Tracker } from './tracker'
import { AdClick } from './ad-click-attribution-policy'

export class TabState {
    /**
     * @param {import('./tab').TabData} tabData
     */
    constructor (tabData, restoring = false) {
        this.tabId = tabData.tabId
        this.url = tabData.url
        /** @type {boolean} */
        this.upgradedHttps = false
        /** @type {boolean} */
        this.hasHttpsError = false
        /** @type {boolean} */
        this.mainFrameUpgraded = false
        /** @type {boolean} */
        this.urlParametersRemoved = false
        /** @type {string | null} */
        this.urlParametersRemovedUrl = null
        /** @type {string | null} */
        this.ampUrl = null
        /** @type {string | null} */
        this.cleanAmpUrl = null
        this.requestId = tabData.requestId
        this.status = tabData.status
        this.statusCode = null // statusCode is set when headers are recieved in tabManager.js
        /** @type {null | import('./ad-click-attribution-policy').AdClick} */
        this.adClick = null
        /** @type {Record<string, import('./tracker').Tracker>} */
        this.trackers = {}
        /** @type {null | import('../events/referrer-trimming').Referrer} */
        this.referrer = null
        /** @type {string[]} */
        this.disabledClickToLoadRuleActions = []
        /** @type {Record<string, number[]>} */
        this.dnrRuleIdsByDisabledClickToLoadRuleAction = {}
        /** @type {boolean} */
        this.ctlYouTube = false // True when at least one YouTube Click to Load placeholder was displayed in the tab.
        /** @type {boolean} */
        this.ctlFacebookPlaceholderShown = false
        /** @type {boolean} */
        this.ctlFacebookLogin = false
        /** @type {boolean} */
        this.allowlisted = false // user-allowlisted sites; applies to all privacy features
        /** @type {boolean} */
        this.allowlistOptIn = false
        /** @type {boolean} */
        this.denylisted = false
        /** @type {string[]} */
        this.debugFlags = []
        /** @type {string[]} */
        this.errorDescriptions = []
        /** @type {number[]} */
        this.httpErrorCodes = []
        // Whilst restoring, prevent the tab data being stored
        if (!restoring) {
            Storage.backup(this)
        }
    }

    static async done () {
        await Storage.done()
    }

    /**
     * @template {InstanceType<typeof TabState>} T
     * @template {keyof T} K
     * @param {K} key
     * @param {T[K]} value
     */
    setValue (key, value) {
        // @ts-expect-error - we know this is a valid key, ts doesn't seem to understand T matches this
        this[key] = value
        // Fire and forget storage backup
        Storage.backup(this)
    }

    /**
     * Restores a tab state from storage.
     * @param {number} tabId
     * @returns {Promise<TabState | null>}
     */
    static async restore (tabId) {
        const data = await Storage.get(tabId)
        if (!data) {
            return null
        }
        let parsedData
        try {
            parsedData = JSON.parse(data)
        } catch (e) {
            console.error('Error parsing tab state', e)
            return null
        }
        const state = new TabState(parsedData, true)
        for (const [key, value] of Object.entries(parsedData)) {
            if (key === 'trackers') {
                /** @type {Record<string, import('./tracker').Tracker>} */
                const trackers = {}
                for (const trackerKey of Object.keys(value)) {
                    const tracker = parsedData[key][trackerKey]
                    trackers[trackerKey] = Tracker.restore(tracker)
                }
                state[key] = trackers
            } else if (key === 'adClick' && value) {
                state[key] = AdClick.restore(value)
            } else {
                state[key] = value
            }
        }
        await Storage.backup(state)
        return state
    }

    /**
     * Used for removing the stored tab state.
     * @param {number} tabId
     */
    static async delete (tabId) {
        await Storage.delete(tabId)
    }
}

/**
 * Singleton that handles storage of tab state to session storage.
 * Guarantees that the tasks are performed in the order they are added.
 * Fire and forget of the storage tasks to simplify call sites.
 */
class StorageInstance {
    taskQueue = []
    processing = false

    /**
     * Awaits until the storage queue is empty.
     * @returns {Promise<void>}
     */
    async done () {
        const queue = this.taskQueue
        await Promise.all(queue)
    }

    /**
     * Adds a task to the storage queue, prevents tasks from being executed in parallel.
     * Returns the result of the task.
     * Please handle the error handling of the task method yourself.
     * @template T
     * @param {() => Promise<T>} task
     * @returns {Promise<T>}
     */
    async _addTask (task) {
        let done = _ => {}
        this.taskQueue.push(async () => {
            const value = await Promise.resolve(task())
            done(value)
        })
        this.processQueue()
        return new Promise(resolve => {
            done = resolve
        })
    }

    /**
     * Processes the storage queue in order.
     */
    async processQueue () {
        if (!this.processing) {
            while (this.taskQueue.length > 0) {
                this.processing = true
                const task = this.taskQueue.shift()
                await task()
            }
            this.processing = false
        }
    }

    /**
     * Returns a string key for the storage lookup of a tab.
     * @param {number} tabId
     * @returns {string}
     */
    static _getStorageKey (tabId) {
        return `tabState-${tabId}`
    }

    /**
     * Deletes a tab-state from session storage.
     * @param {number} tabId
     */
    async delete (tabId) {
        await this._addTask(async () => {
            try {
                await removeFromSessionStorage(StorageInstance._getStorageKey(tabId))
            } catch (e) {
                console.error('Removal of tab state failed', e)
            }
        })
    }

    /**
     * Gets a serialized tab-state from session storage.
     * @param {number} tabId
     * @returns {Promise<string | undefined>}
     */
    async get (tabId) {
        return this._addTask(async () => {
            try {
                return getFromSessionStorage(StorageInstance._getStorageKey(tabId))
            } catch (e) {
                console.error('Retrieval of tab state failed', e)
                return undefined
            }
        })
    }

    /**
     * @param {TabState} tabState
     * @returns {Promise<void>}
     */
    async backup (tabState) {
        await this._addTask(async () => {
            try {
                await setToSessionStorage(StorageInstance._getStorageKey(tabState.tabId), JSON.stringify(tabState))
            } catch (e) {
                console.error('Storage of tab state failed', e)
            }
        })
    }
}
const Storage = new StorageInstance()
