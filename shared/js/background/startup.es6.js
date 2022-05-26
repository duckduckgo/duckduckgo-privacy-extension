import browser from 'webextension-polyfill'
const Companies = require('./companies.es6')
const experiment = require('./experiments.es6')
const https = require('./https.es6')
const httpsStorage = require('./storage/https.es6')
const settings = require('./settings.es6')
const tabManager = require('./tab-manager.es6')
const tdsStorage = require('./storage/tds.es6')
const trackers = require('./trackers.es6')
const { fetchAlias, showContextMenuAction } = require('./email-utils.es6')

/** @module */

let resolveReadyPromise
const readyPromise = new Promise(resolve => { resolveReadyPromise = resolve })

async function onStartup () {
    await settings.ready()
    experiment.setActiveExperiment()

    try {
        const httpsLists = await httpsStorage.getLists()
        https.setLists(httpsLists)

        const tdsLists = await tdsStorage.getLists()
        trackers.setLists(tdsLists)
    } catch (e) {
        console.log(e)
    }

    https.sendHttpsUpgradeTotals()

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
            tabManager.create(tab)
        }
    }

    if (resolveReadyPromise) {
        resolveReadyPromise()
        resolveReadyPromise = null
    }
}

function ready () {
    return readyPromise
}

module.exports = {
    onStartup,
    ready
}
