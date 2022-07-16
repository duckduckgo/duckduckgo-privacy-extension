/**
 * This exposes some modules we use for testing via the background page console.
 * NOTE this is not added to the release version of the extension
 */
const settings = require('./settings.es6')
const tabManager = require('./tab-manager.es6')
const { ATB: atb } = require('./atb.es6')
const https = require('./https.es6')
const tds = require('./storage/tds.es6')
const startup = require('./startup.es6')
const browserWrapper = require('./wrapper.es6')

// @ts-ignore
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
browserWrapper.setToSessionStorage('dev', true)
