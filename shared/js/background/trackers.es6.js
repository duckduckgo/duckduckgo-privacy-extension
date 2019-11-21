const utils = require('./utils.es6')
const tldts = require('tldts')
const Trackers = require('@duckduckgo/privacy-grade').Trackers
module.exports = new Trackers({tldjs: tldts, utils})
