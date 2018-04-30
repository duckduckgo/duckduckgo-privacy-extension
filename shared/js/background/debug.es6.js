/**
 * This exposes some modules we use for testing via the background page console.
 * NOTE this is not added to the release version of the extension
 */
const settings = require('./settings.es6')
const abp = require('abp-filter-parser')
const tabManager = require('./tab-manager.es6')

window.dbg = {
    settings,
    abp,
    tabManager
}
