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
        // Clear previously set cookies
        var cookies = document.cookie.split('; ')
        for (var c = 0; c < cookies.length; c++) {
            var d = window.location.hostname
            var cookieBase = encodeURIComponent(cookies[c].split(';')[0].split('=')[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d + ' ;path='
            var p = location.pathname.split('/')
            document.cookie = cookieBase + '/'
            while (p.length > 0) {
                document.cookie = cookieBase + p.join('/')
                p.pop()
            };
        }

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
