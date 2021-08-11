module.exports = {
    setBrowserClassOnBodyTag: function () {
        window.chrome.runtime.sendMessage({ getBrowser: true }, (browser) => {
            if (['edg', 'edge', 'brave'].includes(browser)) {
                browser = 'chrome'
            }
            // TEMPORARY FIX FOR SAFARI
            if (browser === undefined) browser = 'chrome'

            const browserClass = 'is-browser--' + browser
            window.$('html').addClass(browserClass)
            window.$('body').addClass(browserClass)
        })
    }
}
