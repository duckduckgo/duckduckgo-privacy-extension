/**
 *
 * Sets GPC signal
 *
 */
const settings = require('./settings.es6')
const utils = require('./utils.es6')

// Return Sec-GPC header if setting enabled
function getHeader () {
    const GPCEnabled = settings.getSetting('GPC')
    if (GPCEnabled) {
        return {
            name: 'Sec-GPC',
            value: '1'
        }
    }
}

// Add navigator.globalPrivacyControl property to all frames if setting enabled
// The script injected in Firefox is different from the script injected in Chromium-
// based browsers due to slight differences in how the browsers interpret script-src
// CSP directives, and the existence of Xray vision in Firefox.
function injectDOMSignal (tabId, frameId) {
    const GPCEnabled = settings.getSetting('GPC')
    const browserName = utils.getBrowserName()
    const contentScriptName = browserName === 'moz' ? 'GPC-moz.js' : 'GPC.js'

    // first pass GPC value to frames
    chrome.tabs.executeScript(tabId, {
        code: `
            try {
                var globalPrivacyControlValue = ${GPCEnabled}
            } catch(e) {}`,
        matchAboutBlank: true,
        frameId: frameId,
        runAt: 'document_start'
    })
    // next inject script to set value on navigator
    chrome.tabs.executeScript(tabId, {
        file: `public/js/content-scripts/${contentScriptName}`,
        matchAboutBlank: true,
        frameId: frameId,
        runAt: 'document_start'
    })
}

module.exports = {
    getHeader: getHeader,
    injectDOMSignal: injectDOMSignal
}
