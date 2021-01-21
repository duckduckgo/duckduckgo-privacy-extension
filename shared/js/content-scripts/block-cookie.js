// Set up 3rd party cookie blocker
(function cookieBlocker() {
    function getFrameUrl() {
        let url = document.location.href,
        parentFrame = (document != window.top) && window.parent
        while (parentFrame && url && !url.startsWith("http")) {
            try {
                url = parentFrame.document.location.href
            } catch (ex) {
                // ignore 'Blocked a fr[ame with origin "..."
                // from accessing a cro]ss-origin frame.' exceptions
            }
            parentFrame = (parentFrame != window.top) && parentFrame.parent
        }
        return url
    }

    if (window.top == window) {
        return
    }

    chrome.runtime.sendMessage({
        'checkThirdParty': true,
        frameUrl: getFrameUrl()
    }, function (isThridParty) {
        if (isThridParty) {
            const scriptString = `
                (function() {
                    // Clear previously set cookies
                    var cookies = document.cookie.split("; ");
                    for (var c = 0; c < cookies.length; c++) {
                        var d = window.location.hostname.split(".");
                        while (d.length > 0) {
                            var cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';
                            var p = location.pathname.split('/');
                            document.cookie = cookieBase + '/';
                            while (p.length > 0) {
                                document.cookie = cookieBase + p.join('/');
                                p.pop();
                            };
                            d.shift();
                        }
                    }

                    // disable setting cookies
                    document.__defineSetter__ ('cookie', function(value) { })
                })()
            `

            const scriptElement = document.createElement('script')
            scriptElement.innerHTML = scriptString
            document.documentElement.prepend(scriptElement)
        }
    })
})()
