/**
 * This exposes some modules we use for testing via the background page console.
 * NOTE this is not added to the release version of the extension
 */
import { onStartup, ready } from './startup'
import Companies from './companies'
import atb from './atb'
import tds from './storage/tds'
import { createNewtabTrackerStatsDebugApi } from './newtab-tracker-stats-debug'
import {
    sendPageloadsWithAdAttributionPixelAndResetCount
} from './classes/ad-click-attribution-policy'
const settings = require('./settings')
const tabManager = require('./tab-manager')
const https = require('./https')
const browserWrapper = require('./wrapper')
const utils = require('./utils')
const Tab = require('./classes/tab')
const { TabState } = require('./classes/tab-state')
const Wrapper = require('./wrapper.js')
const { setListContents, getListContents } = require('./message-handlers')

export default function initDebugBuild () {
    // @ts-ignore - dbg is not a standard property of self.
    self.dbg = {
        settings,
        startup: {
            ready,
            onStartup
        },
        tabManager,
        Tab,
        TabState,
        Wrapper,
        atb,
        https,
        tds,
        browserWrapper,
        utils,
        setListContents,
        getListContents,
        companies: Companies,
        ntts: createNewtabTrackerStatsDebugApi(),
        sendPageloadsWithAdAttributionPixelAndResetCount
    }

    // mark this as a dev build
    // when we request certain resources, this flag will prevent any
    // metrics from being thrown off
    browserWrapper.setToSessionStorage('dev', true)
}
