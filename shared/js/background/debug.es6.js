/**
 * This exposes some modules we use for testing via the background page console.
 * NOTE this is not added to the release version of the extension
 */
import * as startup from './startup'
import * as settings from './settings'
import tds from './storage/tds'
const tabManager = require('./tab-manager')
const atb = require('./atb.es6')
const https = require('./https')
const browserWrapper = require('./wrapper.es6')
const utils = require('./utils')
const Tab = require('./classes/tab')
const { TabState } = require('./classes/tab-state')
const Wrapper = require('./wrapper.es6.js')

// @ts-ignore - dbg is not a standard property of self.
self.dbg = {
    settings,
    startup,
    tabManager,
    Tab,
    TabState,
    Wrapper,
    atb,
    https,
    tds,
    browserWrapper,
    utils
}

// mark this as a dev build
// when we request certain resources, this flag will prevent any
// metrics from being thrown off
browserWrapper.setToSessionStorage('dev', true)
