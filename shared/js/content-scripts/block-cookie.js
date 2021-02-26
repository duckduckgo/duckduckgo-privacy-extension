// Set up 3rd party cookie blocker
(function cookieBlocker () {
    // don't inject into non-HTML documents (such as XML documents)
    // but do inject into XHTML documents
    if (document instanceof HTMLDocument === false && (
        document instanceof XMLDocument === false ||
        document.createElement('div') instanceof HTMLDivElement === false
    )) {
        return
    }

    function clearInjectedCookiesAndBlock () {
        // disable setting cookies
        document.__defineSetter__('cookie', function (value) { })
        document.__defineGetter__('cookie', () => '')
    }

    if (window.top === window) {
        return
    }

    chrome.runtime.sendMessage({
        'checkThirdParty': true
    }, function (action) {
        var scriptString = ''
        if (action.shouldBlock) {
            scriptString = `(${clearInjectedCookiesAndBlock.toString()})()`
        }

        var doc = document
        if (window.wrappedJSObject) {
            doc = window.wrappedJSObject.document
        }
        const scriptElement = doc.createElement('script')
        scriptElement.innerHTML = scriptString
        doc.documentElement.prepend(scriptElement)
    })
})()
