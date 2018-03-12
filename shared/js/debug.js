/**
 * This exposes some modules we use for testing via the background page console.
 * NOTE this is not added to the release version of the extension
 */
const settings = require('./settings')
const abp = require('abp-filter-parser')

window.dbg = {
  settings,
  abp
}
