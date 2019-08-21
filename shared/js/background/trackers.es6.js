const utils = require('./utils.es6')
const tldjs = require('tldjs')
const Trackers = require('@duckduckgo/privacy-grade').Trackers
module.exports = new Trackers({tldjs, utils})
