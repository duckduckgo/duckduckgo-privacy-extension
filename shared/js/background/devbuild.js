/**
 * This exposes some modules we use for testing via the background page console.
 * NOTE this is not added to the release version of the extension
 */
import * as startup from './startup'
import atb from './atb'
import tds from './storage/tds'
import { createNewtabTrackerStatsDebugApi } from './newtab-tracker-stats-debug'
const settings = require('./settings')
const https = require('./https')
const browserWrapper = require('./wrapper')
const utils = require('./utils')
const Tab = require('./classes/tab')
const { TabState } = require('./classes/tab-state')
const Wrapper = require('./wrapper.js')

export class DBG {
    /**
     * @param {import("./tab-manager").TabManager} tabManager
     * @param {import("./companies").Companies} companies
     * @param {import("./message-handlers").LegacyMessageHandlers} messageHandlers
     */
    constructor (tabManager, companies, messageHandlers) {
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
            utils,
            setListContents: messageHandlers.setListContents,
            getListContents: messageHandlers.getListContents,
            companies,
            ntts: createNewtabTrackerStatsDebugApi()
        }
    }
}

// mark this as a dev build
// when we request certain resources, this flag will prevent any
// metrics from being thrown off
browserWrapper.setToSessionStorage('dev', true)
