import browser from 'webextension-polyfill'

function init () {
    browser.webRequest.onBeforeRequest.addListener((details) => {
        try {
            // parse requestBody as an ASCII string
            const report = String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes))
            if (report.indexOf('moz-extension://') !== -1) {
                return { cancel: true }
            }
        } catch (e) {
            console.warn('Unable to parse CSP report contents', details.url)
        }
    }, {
        urls: ['<all_urls>'],
        types: ['csp_report']
    }, ['blocking', 'requestBody'])
}

export {
    init
}
