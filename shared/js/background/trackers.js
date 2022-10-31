import * as utils from './utils.js'
import { Trackers } from '@duckduckgo/privacy-grade'
import * as tldts from 'tldts'

/**
 * @typedef {import("@duckduckgo/privacy-grade/src/classes/trackers.js").ActionName} ActionName
 * @typedef {import("@duckduckgo/privacy-grade/src/classes/trackers.js").TrackerData} TrackerData
 **/

/** @type {import("@duckduckgo/privacy-grade/src/classes/trackers.js")} */
export const trackersInstance = new Trackers({ tldjs: tldts, utils })
