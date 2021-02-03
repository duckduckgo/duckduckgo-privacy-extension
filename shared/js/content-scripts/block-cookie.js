// Set up 3rd party cookie blocker
(function cookieBlocker () {
    function getFrameUrl () {
        let url = document.location.href
        let parentFrame = (document !== window.top) && window.parent
        while (parentFrame && url && !url.startsWith('http')) {
            try {
                url = parentFrame.document.location.href
            } catch (ex) {
                // ignore 'Blocked a fr[ame with origin '...'
                // from accessing a cro]ss-origin frame.' exceptions
            }
            parentFrame = (parentFrame !== window.top) && parentFrame.parent
        }
        return url
    }

    function clearInjectedCookiesAndBlock () {
        // Clear previously set cookies
        var cookies = document.cookie.split('; ')
        for (var c = 0; c < cookies.length; c++) {
            var d = window.location.hostname.split('.')
            while (d.length > 0) {
                var cookieBase = encodeURIComponent(cookies[c].split(';')[0].split('=')[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path='
                var p = location.pathname.split('/')
                document.cookie = cookieBase + '/'
                while (p.length > 0) {
                    document.cookie = cookieBase + p.join('/')
                    p.pop()
                };
                d.shift()
            }
        }

        // disable setting cookies
        document.__defineSetter__('cookie', function (value) { })
    }

    function enforceCookieExpiry () {
        var cookieSetter = document.__lookupSetter__('cookie')
        // Enforce 7 day max expiry
        document.__defineSetter__('cookie', function (value) {
            var today = new Date()
            var nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)
            var comps = value.split(';')
            var expiryFound = false
            for (var i = 0; i < comps.length; i++) {
                if (comps[i].trim().startsWith('expires')) {
                    expiryFound = true
                    const dateStr = comps[i].trim().replace('expires=', '').trim()
                    const setDate = new Date(dateStr)
                    if (setDate > nextWeek) {
                        comps[i] = 'expires=' + nextWeek.toUTCString()
                    }

                    break
                }
            }

            if (!expiryFound) {
                comps.push('expires=' + nextWeek.toUTCString())
            }

            const cookieStr = comps.join(';')

            cookieSetter.apply(document, cookieStr)
        })
    }

    if (window.top === window) {
        return
    }

    chrome.runtime.sendMessage({
        'checkThirdParty': true,
        frameUrl: getFrameUrl()
    }, function (isThridParty) {
        var scriptString = ''
        if (isThridParty) {
            scriptString = `(function() { ${clearInjectedCookiesAndBlock.toString()}() })()`
        } else {
            scriptString = `(function() { ${enforceCookieExpiry.toString()}() })()`
        }

        const scriptElement = document.createElement('script')
        scriptElement.innerHTML = scriptString
        document.documentElement.prepend(scriptElement)
    })
})()
