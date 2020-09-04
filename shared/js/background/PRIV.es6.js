/**
 *
 * Sets PRIV signal
 *
 */
const settings = require('./settings.es6')

function setHeader (requestHeaders) {
    settings.ready().then(() => {
        const PRIVEnabled = settings.getSetting('PRIVEnabled')
        if (PRIVEnabled) {
            const PRIVValue = settings.getSetting('PRIVValue')
            requestHeaders.push({
              name: 'Sec-PRIV',
              value: PRIVValue
            })
        }
        return requestHeaders
    })
}

function injectDOMSignal (tabId) {
    settings.ready().then(() => {
        const PRIVEnabled = settings.getSetting('PRIVEnabled')
        if (PRIVEnabled) {
            const PRIVValue = settings.getSetting('PRIVValue')
            chrome.tabs.executeScript(tabId, {
                allFrames: true,
                matchAboutBlank: true,
                runAt: 'document_start',
                code: `
                    let pageWindow = window.wrappedJSObject;
                    pageWindow.PRIV = '${PRIVValue}';`
            })
        }
    })
}

module.exports = {
    setHeader: setHeader,
    injectDOMSignal: injectDOMSignal
}

