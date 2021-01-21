// Set up 3rd party cookie blocker
(function cookieBlocker() {
    function getFrameUrl() {
        let url = document.location.href,
        parentFrame = (document != window.top) && window.parent;
        while (parentFrame && url && !url.startsWith("http")) {
            try {
                url = parentFrame.document.location.href;
            } catch (ex) {
                // ignore 'Blocked a fr[ame with origin "..."
                // from accessing a cro]ss-origin frame.' exceptions
            }
            parentFrame = (parentFrame != window.top) && parentFrame.parent;
        }
        return url;
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
                    document.__defineSetter__ ('cookie', function(value) { })
                })()
            `

            const scriptElement = document.createElement('script')
            scriptElement.innerHTML = scriptString
            document.documentElement.prepend(scriptElement)
        }
    })
})()
