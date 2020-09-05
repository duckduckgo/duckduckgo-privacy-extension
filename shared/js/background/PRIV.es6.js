/**
 *
 * Sets PRIV signal
 *
 */
const settings = require('./settings.es6')
const utils = require('./utils.es6')

function setHeader () {
    const PRIVEnabled = settings.getSetting('PRIVEnabled')
    if (PRIVEnabled) {
        const PRIVValue = settings.getSetting('PRIVValue')
        return {
            name: 'Sec-PRIV',
            value: PRIVValue
        }
    }
}

function injectDOMSignal (tabId) {
    const PRIVEnabled = settings.getSetting('PRIVEnabled')
    if (PRIVEnabled) {
        const PRIVValue = settings.getSetting('PRIVValue')
        const browserName = utils.getBrowserName()
        chrome.tabs.executeScript(tabId, {
            file: `public/js/content-scripts/PRIV-${browserName}.js`,
            allFrames: true,
            matchAboutBlank: true,
            runAt: 'document_start'
        })
    }
}

module.exports = {
    setHeader: setHeader,
    injectDOMSignal: injectDOMSignal
}

