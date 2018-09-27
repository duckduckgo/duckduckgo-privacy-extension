/**
 *
 * This is part of our tool for anonymous engagement metrics
 * Learn more at https://duck.co/help/privacy/atb
 *
 */

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
function fire () {
    if (!arguments.length) return

    let args = Array.prototype.slice.call(arguments)
    const pixelName = args[0]

    if (typeof pixelName !== 'string') return

    const url = getURL(pixelName)

    if (!url) return

    args = args.slice(1)
    args = args.concat(getAdditionalParams())
    const paramString = concatParams(args)

    // Send the request
    load.url(url + paramString)
}

/**
 *
 * Return URL for the pixel request
 *
 */
function getURL (pixelName) {
    if (!pixelName) return

    const url = 'https://improving.duckduckgo.com/t/'
    return url + pixelName
}

/**
 *
 * Return additional params for the pixel request
 *
 */
function getAdditionalParams () {
    const browserInfo = parseUserAgentString()
    const browser = browserInfo.browser
    const extensionVersion = browserWrapper.getExtensionVersion()
    const atb = settings.getSetting('atb')
    const queryStringParams = {}
    const result = []

    if (browser) result.push(browser.toLowerCase())
    if (extensionVersion) queryStringParams.extensionVersion = extensionVersion
    if (atb) queryStringParams.atb = atb

    result.push(queryStringParams)

    return result
}

/**
 *
 * @param {array} args - data we need to append
 *
 */
function concatParams (args) {
    args = args || []

    let paramString = ''
    let objParamString = ''
    let resultString = ''
    let randomNum = Math.ceil(Math.random() * 1e7)

    args.forEach((arg) => {
        // append keys if object
        if (typeof arg === 'object') {
            objParamString += Object.keys(arg).reduce((params, key) => {
                const val = arg[key]
                if (val || val === 0) return `${params}&${key}=${val}`
            }, '')
        } else if (arg) {
            // otherwise just add args separated by _
            paramString += `_${arg}`
        }
    })

    resultString = `${paramString}?${randomNum}${objParamString}`

    return resultString
}

module.exports = {
    fire: fire,
    getURL: getURL,
    concatParams: concatParams
}
