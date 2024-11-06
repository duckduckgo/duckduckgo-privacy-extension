const utils = require('./utils');
const tldts = require('tldts');
const Trackers = require('@duckduckgo/privacy-grade').Trackers;

/**
 * @typedef {import("../../../node_modules/@duckduckgo/privacy-grade/src/classes/trackers.js").ActionName} ActionName
 * @typedef {import("../../../node_modules/@duckduckgo/privacy-grade/src/classes/trackers.js").TrackerData} TrackerData
 **/

/** @type {import("../../../node_modules/@duckduckgo/privacy-grade/src/classes/trackers.js")} */
const TrackersInstance = new Trackers({ tldjs: tldts, utils });
module.exports = TrackersInstance;
