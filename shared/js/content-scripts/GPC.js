/* global globalPrivacyControlValue */
// Set Global Privacy Control property on DOM
(function setDOMSignal () {
    try {
        const contentType = document.documentElement.ownerDocument.contentType
        // don't inject into xml or json pages
        if (contentType === 'application/xml' ||
            contentType === 'application/json' ||
            contentType === 'text/xml' ||
            contentType === 'text/json') {
            return
        }
    } catch (e) {
        // if we can't find content type, go ahead with injection
    }
    const scriptString = `
        // Catch errors if signal is already set by user agent or other extension
        try {
            Object.defineProperty(navigator, 'globalPrivacyControl', {
                value: ${globalPrivacyControlValue},
                enumerable: true
            })
            // Remove script tag after execution
            document.currentScript.parentElement.removeChild(document.currentScript)
        } catch (e) {}`
    const scriptElement = document.createElement('script')
    scriptElement.innerHTML = scriptString
    document.documentElement.prepend(scriptElement)
})()
