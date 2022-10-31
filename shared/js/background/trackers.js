const utils = require('./utils')
const tldts = require('tldts')
const Trackers = require('@duckduckgo/privacy-grade').Trackers

/**
 * @typedef {import("@duckduckgo/privacy-grade/src/classes/trackers").ActionName} ActionName
 * @typedef {import("@duckduckgo/privacy-grade/src/classes/trackers").TrackerData} TrackerData
 **/

/** @type {import("@duckduckgo/privacy-grade/src/classes/trackers")} */
const TrackersInstance = new Trackers({ tldjs: tldts, utils })
export default TrackersInstance
