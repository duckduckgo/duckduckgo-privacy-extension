/**
 * This exposes some modules we use for testing via the background page console.
 * NOTE this is not added to the release version of the extension
 */
import settings from './settings.es6'
import tabManager from './tab-manager.es6'
import load from './load.es6'
import atb from './atb.es6'
import https from './https.es6'
import tds from './storage/tds.es6'

window.dbg = {
    settings,
    tabManager,
    atb,
    https,
    tds
}

// mark this as a dev build
// when we request certain resources, this flag will prevent any
// metrics from being thrown off
load.setDevMode()
atb.setDevMode()
