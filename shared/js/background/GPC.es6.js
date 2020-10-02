/**
 *
 * Sets GPC signal
 *
 */
const settings = require('./settings.es6')
const utils = require('./utils.es6')

// Return Sec-GPC header if setting enabled
function getHeader () {
    const GPCEnabled = settings.getSetting('GPCEnabled')
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
function injectDOMSignal (tabId) {
    const supportedBrowsers = ['chrome', 'moz', 'edg']
    let browserName = utils.getBrowserName()

    if (!supportedBrowsers.includes(browserName)) return

    const GPCEnabled = settings.getSetting('GPCEnabled')
    // first pass GPC value to frames
    chrome.tabs.executeScript(tabId, {
        code: `
            try {
                var globalPrivacyControlValue = ${GPCEnabled}
            } catch(e) {}`,
        allFrames: true,
        matchAboutBlank: true,
        runAt: 'document_start'
    })
    // next inject script to set value on navigator object. Chromium-based browsers
    // are functionally the same and use the same script, so converge Chrome and Edge
    if (browserName === 'chrome' || browserName === 'edg') {
        browserName = 'chromium'
    }
    chrome.tabs.executeScript(tabId, {
        file: `public/js/content-scripts/GPC-${browserName}.js`,
        allFrames: true,
        matchAboutBlank: true,
        runAt: 'document_start'
    })
}

module.exports = {
    getHeader: getHeader,
    injectDOMSignal: injectDOMSignal
}
