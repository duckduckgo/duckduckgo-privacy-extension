/**
 * This exposes some modules we use for testing via the background page console.
 * NOTE this is not added to the release version of the extension
 */
import * as startup from './startup'
import * as settings from './settings'
import tds from './storage/tds'
import tabManager from './tab-manager'
import atb from './atb'
import https from './https'
import * as utils from './utils'
import { TabState } from './classes/tab-state'
import { Tab } from './classes/tab'
import * as browserWrapper from './wrapper.es6'
const Wrapper = browserWrapper

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
