import browser from 'webextension-polyfill'
const { getCurrentTab } = require('./utils.es6')
const browserUIWrapper = require('../ui/base/ui-wrapper.es6')
const browserWrapper = require('./wrapper.es6')
const Companies = require('./companies.es6')
const experiment = require('./experiments.es6')
const https = require('./https.es6')
const httpsStorage = require('./storage/https.es6')
const settings = require('./settings.es6')
const tabManager = require('./tab-manager.es6')
const tdsStorage = require('./storage/tds.es6')
const trackers = require('./trackers.es6')
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

    registerUnloadHandler()
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

/**
 * Register a global function that the popup can call when it's closed.
 *
 * NOTE: This has to be a global method because messages via `chrome.runtime.sendMessage` don't make it in time
 * when the popup is closed.
 */
function registerUnloadHandler () {
    let timeout
    // @ts-ignore - popupUnloaded is not a standard property of self.
    self.popupUnloaded = (userActions) => {
        clearTimeout(timeout)
        if (userActions.includes('toggleAllowlist')) {
            timeout = setTimeout(() => {
                getCurrentTab().then(tab => {
                    if (tab) {
                        browserUIWrapper.reloadTab(tab.id)
                    }
                })
            }, 500)
        }
    }
}
