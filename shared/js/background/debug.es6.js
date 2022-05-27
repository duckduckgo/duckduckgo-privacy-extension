/**
 * This exposes some modules we use for testing via the background page console.
 * NOTE this is not added to the release version of the extension
 */
const settings = require('./settings.es6')
const tabManager = require('./tab-manager.es6')
const load = require('./load.es6')
const atb = require('./atb.es6')
const https = require('./https.es6')
const tds = require('./storage/tds.es6')
const messageHandlers = require('./message-handlers')
const startup = require('./startup.es6')

self.dbg = {
    settings,
    startup,
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
messageHandlers._setDevMode()
