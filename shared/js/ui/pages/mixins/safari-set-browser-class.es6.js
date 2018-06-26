module.exports = {
    setBrowserClassOnBodyTag: function () {
        let browserClass = 'is-browser--' + 'safari'
        window.$('html').addClass(browserClass)
        window.$('body').addClass(browserClass)
    }
}
