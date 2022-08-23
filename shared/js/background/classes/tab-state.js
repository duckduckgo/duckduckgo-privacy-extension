import { getFromSessionStorage, setToSessionStorage, removeFromSessionStorage } from '../wrapper.es6'

export class TabState {
    /**
     * @param {import('./tab.es6').TabData} tabData
     */
    constructor (tabData) {
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

        this.allowlisted = false // user-allowlisted sites; applies to all privacy features
        this.allowlistOptIn = false
        this.denylisted = false
    }

    static getStorageKey (tabId) {
        return `tabState-${tabId}`
    }

    /**
     * TODO ensure we only write in the correct order (wait other previous writes)
     * TODO move setters into tabstate and call backup interally to reduce chance of impl drift
     */
    async backup () {
        await setToSessionStorage(TabState.getStorageKey(this.tabId), JSON.stringify(this))
    }

    /**
     * @param {number} tabId
     * @returns {Promise<TabState | null>}
     */
    static async restore (tabId) {
        const data = await getFromSessionStorage(TabState.getStorageKey(tabId))
        if (!data) {
            return null
        }
        const parsedData = JSON.parse(data)
        const state = new TabState(parsedData)
        for (const key of Object.keys(parsedData)) {
            state[key] = parsedData[key]
        }
        return state
    }

    static createFromSerialized (serialized) {
        const state = new TabState(serialized)
        for (const key of Object.keys(serialized)) {
            state[key] = serialized[key]
        }
        return state
    }

    /**
     * Used for removing the stored tab state.
     */
    static async clear (tabId) {
        removeFromSessionStorage(TabState.getStorageKey(tabId))
    }
}
