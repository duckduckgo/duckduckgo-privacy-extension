module.exports = {
    setBrowserClassOnBodyTag: function () {
        let browser = 'safari'
            let browserClass = 'is-browser--' + browser;
            $('body').addClass(browserClass);
    }
}
