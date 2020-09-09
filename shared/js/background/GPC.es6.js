/**
 *
 * Sets GPC signal
 *
 */
const settings = require('./settings.es6')
const utils = require('./utils.es6')

// Add Sec-GPC header to outbound HTTP requests if setting enabled
function setHeader () {
    const GPCEnabled = settings.getSetting('GPCEnabled')
    if (GPCEnabled) {
        const GPCValue = settings.getSetting('GPCValue')
        return {
            name: 'Sec-GPC',
            value: GPCValue
        }
    }
}

// Add navigator.globalPrivacyControl property to all frames if setting enabled
function injectDOMSignal (tabId) {
    const GPCEnabled = settings.getSetting('GPCEnabled')
    if (GPCEnabled) {
        const GPCValue = settings.getSetting('GPCValue')
        const browserName = utils.getBrowserName()
        if (browserName === 'chrome' || 'moz') {
            // first pass GPC value to frames
            chrome.tabs.executeScript(tabId, {
                code: `
                    try {
                        var globalPrivacyControlValue = '${GPCValue}'
                    } catch(e) {}`,
                allFrames: true,
                matchAboutBlank: true,
                runAt: 'document_start'
            })
            // next inject script to set value on navigator object
            chrome.tabs.executeScript(tabId, {
                file: `public/js/content-scripts/GPC-${browserName}.js`,
                allFrames: true,
                matchAboutBlank: true,
                runAt: 'document_start'
            })
        }
    }
}

module.exports = {
    setHeader: setHeader,
    injectDOMSignal: injectDOMSignal
}

