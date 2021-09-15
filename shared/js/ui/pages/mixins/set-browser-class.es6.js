module.exports = {
    setBrowserClassOnBodyTag: function () {
        window.chrome.runtime.sendMessage({ messageType: 'getBrowser' }, (browser) => {
            if (['edg', 'edge', 'brave'].includes(browser)) {
                browser = 'chrome'
            }
            const browserClass = 'is-browser--' + browser
            window.$('html').addClass(browserClass)
            window.$('body').addClass(browserClass)
        })
    }
}
