const backgroundPage = chrome.extension.getBackgroundPage();

module.exports = {

    setBrowserClassOnBodyTag: function () {
        let browserClass = 'is-browser--' + backgroundPage.browser;
        $('body').addClass(browserClass);
    }

}
