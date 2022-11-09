const Trackers = require('./classes/trackers')

/**
 * @typedef {import("./classes/trackers.js").ActionName} ActionName
 * @typedef {import("./classes/trackers.js").TrackerData} TrackerData
 **/

/** @type {import("./classes/trackers.js")} */
const TrackersInstance = new Trackers()
module.exports = TrackersInstance
