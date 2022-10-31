import browser from 'webextension-polyfill'
import * as settings from './settings'
import https from './https'
import tabManager from './tab-manager'
import httpsStorage from './storage/https'
import experiment from './experiments'
import tdsStorage from './storage/tds'
import trackers from './trackers'
const browserWrapper = require('./wrapper.es6')
const Companies = require('./companies.es6')
const dnrSessionId = require('./dnr-session-rule-id')
const { fetchAlias, showContextMenuAction } = require('./email-utils.es6')
const manifestVersion = browserWrapper.getManifestVersion()
/** @module */

let resolveReadyPromise
const readyPromise = new Promise(resolve => { resolveReadyPromise = resolve })

export async function onStartup () {
    if (manifestVersion === 3) {
        await dnrSessionId.setSessionRuleOffsetFromStorage()
    }

    await settings.ready()
    experiment.setActiveExperiment()

    try {
        const httpsLists = await httpsStorage.getLists(/* preferLocal= */true)
        https.setLists(httpsLists)

        const tdsLists = await tdsStorage.getLists(/* preferLocal= */true)
        trackers.setLists(tdsLists)
    } catch (e) {
        console.log(e)
    }

    Companies.buildFromStorage()

    // fetch alias if needed
    const userData = settings.getSetting('userData')
    if (userData && userData.token) {
        if (!userData.nextAlias) await fetchAlias()
        showContextMenuAction()
    }

    const savedTabs = await browser.tabs.query({ currentWindow: true, status: 'complete' })
    for (let i = 0; i < savedTabs.length; i++) {
        const tab = savedTabs[i]

        if (tab.url) {
            // On reinstall we wish to create the tab again
            await tabManager.restoreOrCreate(tab)
        }
    }

    if (resolveReadyPromise) {
        resolveReadyPromise()
        resolveReadyPromise = null
    }
}

export function ready () {
    return readyPromise
}
