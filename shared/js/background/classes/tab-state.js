import { getFromSessionStorage, setToSessionStorage, removeFromSessionStorage } from '../wrapper.es6'

export class TabState {
    /**
     * @param {import('./tab.es6').TabData} tabData
     */
    constructor (tabData, restoring = false) {
        this.tabId = tabData.tabId
        this.url = tabData.url
        this.upgradedHttps = false
        this.hasHttpsError = false
        this.mainFrameUpgraded = false
        this.urlParametersRemoved = false
        this.urlParametersRemovedUrl = null
        this.ampUrl = null
        this.cleanAmpUrl = null
        this.requestId = tabData.requestId
        this.status = tabData.status
        this.statusCode = null // statusCode is set when headers are recieved in tabManager.js
        this.adClick = null
        /** @type Record<string, import('./tracker').Tracker> */
        this.trackers = {}

        this.allowlisted = false // user-allowlisted sites; applies to all privacy features
        this.allowlistOptIn = false
        this.denylisted = false
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
        const parsedData = JSON.parse(data)
        const state = new TabState(parsedData, true)
        for (const key of Object.keys(parsedData)) {
            state[key] = parsedData[key]
        }
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
 * Handles storage of tab state to session storage.
 * Guarantees that the tasks are performed in the order they are added.
 */
class Storage {
    static doneCheck = Promise.resolve()

    /**
     * Awaits until the storage queue is empty.
     * @returns {Promise<void>}
     */
    static async done () {
        await Storage.doneCheck
    }

    /**
     * Adds a task to the storage queue, prevents tasks from being executed in parallel.
     * Returns the result of the task.
     * @template T
     * @param {() => Promise<T>} task
     * @returns {Promise<T>}
     */
    static async addTask (task) {
        let done = _ => {}
        Storage.doneCheck = Storage.doneCheck.then(async () => {
            const value = await Promise.resolve(task())
            done(value)
        })
        return new Promise(resolve => {
            done = resolve
        })
    }

    /**
     * Returns a string key for the storage lookup of a tab.
     * @param {number} tabId
     * @returns {string}
     */
    static getStorageKey (tabId) {
        return `tabState-${tabId}`
    }

    /**
     * Deletes a tab-state from session storage.
     * @param {number} tabId
     */
    static async delete (tabId) {
        await Storage.addTask(async () => {
            try {
                await removeFromSessionStorage(Storage.getStorageKey(tabId))
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
    static async get (tabId) {
        return Storage.addTask(async () => {
            return getFromSessionStorage(Storage.getStorageKey(tabId))
        })
    }

    /**
     * TODO debounce
     * @param {TabState} tabState
     * @returns {Promise<void>}
     */
    static async backup (tabState) {
        await Storage.addTask(async () => {
            try {
                await setToSessionStorage(Storage.getStorageKey(tabState.tabId), JSON.stringify(tabState))
            } catch (e) {
                console.error('Storage of tab state failed', e)
            }
        })
    }
}
