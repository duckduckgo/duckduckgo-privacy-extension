module.exports = {
    setBrowserClassOnBodyTag: function () {

        chrome.runtime.sendMessage({'getBrowser': true}, (browser) => {
            let browserClass = 'is-browser--' + browser;
            $('html').addClass(browserClass);
            $('body').addClass(browserClass);
        });
    }
}
