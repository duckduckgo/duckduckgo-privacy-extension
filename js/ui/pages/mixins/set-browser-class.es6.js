module.exports = {
    setBrowserClassOnBodyTag: function () {

        chrome.runtime.sendMessage({'getBrowser': true}, (browser) => {
            let browserClass = 'is-browser--' + browser;
            $('body').addClass(browserClass);
        });
    }
}
