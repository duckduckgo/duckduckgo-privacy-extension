const utils = require('./utils.es6')
const tldjs = require('tldjs')
const Trackers = require('./trackers-algo.js')
module.exports = new Trackers({tldjs, utils})
