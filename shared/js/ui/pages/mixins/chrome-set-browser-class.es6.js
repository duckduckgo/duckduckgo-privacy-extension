module.exports = {
    setBrowserClassOnBodyTag: function () {
        window.chrome.runtime.sendMessage({'getBrowser': true}, (browser) => {
            let browserClass = 'is-browser--' + browser
            window.$('html').addClass(browserClass)
            window.$('body').addClass(browserClass)
        })
    }
}
