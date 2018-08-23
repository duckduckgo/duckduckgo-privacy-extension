/**
 *
 * This is part of our tool for anonymous engagement metrics
 * Learn more at https://duck.co/help/privacy/atb
 *
 */

const utils = require('./utils.es6')
const load = require('./load.es6')
const browserWrapper = require('./$BROWSER-wrapper.es6')
const settings = require('./settings.es6')
const parseUserAgentString = require('../shared-utils/parse-user-agent-string.es6')

/**
 *
 * Fire a pixel
 *
 * @param {string} pixelName
 * @param {...*} args - any number of extra data
 *
 */

function fire (pixelName) {
    if (!arguments.length) return

    let args = Array.prototype.slice.call(arguments)
    const pixelName = args[0]
    const paramString = concatParams(args)
}

/**
 *
 * Return URL for the pixel request
 *
 */
function getURL () {
    const domain = 'improving.duckduckgo.com'
    const path = '/t/'

    return domain + path
}

/**
 *
 * Return additional params for the pixel request
 *
 */
function getAdditionalParams () {
    const browserInfo = parseUserAgentString()

    return {
        browser: browserInfo.browser,
        extensionVersion: browserWrapper.getExtensionVersion(),
        atb: settings.getSetting('atb')
    }
}

/**
 *
 * @param {array} args - data we need to append
 *
 */
function concatParams (args) {
    args = args ? args : []
    
    args.push(getAdditionalParams())
}

module.exports = {
    fire: fire
}
