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
            d.shift()
        }

        // disable setting cookies
        document.__defineSetter__('cookie', function (value) { })
    }

    function enforceCookieExpiry () {
        var cookieSetter = document.__lookupSetter__('cookie')
        // Enforce 7 day max expiry
        document.__defineSetter__('cookie', function (value) {
            const nextWeek = 604800
            var comps = value.split(';')
            var expiryFound = false
            for (var i = 0; i < comps.length; i++) {
                if (comps[i].trim().startsWith('expires')) {
                    expiryFound = true
                    const dateStr = comps[i].trim().replace('expires=', '').trim()
                    const setDate = new Date(dateStr)
                    if (setDate > nextWeek) {
                        comps[i] = 'max-age=' + nextWeek
                    }

                    break
                }
            }

            if (!expiryFound) {
                comps.push('max-age=' + nextWeek)
            }

            const cookieStr = comps.join(';')

            cookieSetter.apply(document, cookieStr)
        })
    }

    if (window.top === window) {
        return
    }

    chrome.runtime.sendMessage({
        'checkThirdParty': true
    }, function (action) {
        console.log(action)
        var scriptString = ''
        if (action.shouldBlock) {
            scriptString = `(${clearInjectedCookiesAndBlock.toString()})()`
        } else if (action.isThirdParty) {
            scriptString = `(${enforceCookieExpiry.toString()})()`
        }

        const scriptElement = document.createElement('script')
        scriptElement.innerHTML = scriptString
        document.documentElement.prepend(scriptElement)
    })
})()
