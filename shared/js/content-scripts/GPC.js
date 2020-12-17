/* global globalPrivacyControlValue */
// Set Global Privacy Control property on DOM
(function setDOMSignal () {
    try {
        const contentType = document.documentElement.ownerDocument.contentType
        // don't inject into xml or json pages
        if (contentType === 'application/xml' ||
            contentType === 'application/json' ||
            contentType === 'text/xml' ||
            contentType === 'text/json' ||
            contentType === 'text/rss+xml' ||
            contentType === 'application/rss+xml'
        ) {
            return
        }
    } catch (e) {
        // if we can't find content type, go ahead with injection
    }
    const scriptString = `
        (function() {
            // If GPC on, set DOM property to true if not already true
            if (${globalPrivacyControlValue}) {
                if (navigator.globalPrivacyControl) return
                Object.defineProperty(navigator, 'globalPrivacyControl', {
                    value: true,
                    enumerable: true
                })
            } else {
                // If GPC off, set DOM property prototype to false so it may be overwritten
                // with a true value by user agent or other extensions
                if (typeof navigator.globalPrivacyControl !== "undefined") return
                Object.defineProperty(Object.getPrototypeOf(navigator), 'globalPrivacyControl', {
                    value: false,
                    enumerable: true
                })
            }
            // Remove script tag after execution
            document.currentScript.parentElement.removeChild(document.currentScript)
        })()
        `
    const scriptElement = document.createElement('script')
    scriptElement.innerHTML = scriptString
    document.documentElement.prepend(scriptElement)
})()
