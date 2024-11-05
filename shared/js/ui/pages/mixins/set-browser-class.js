module.exports = {
    setBrowserClassOnBodyTag: function () {
        window.chrome.runtime.sendMessage({ messageType: 'getBrowser' }, (browserName) => {
            if (['edg', 'edge', 'brave'].includes(browserName)) {
                browserName = 'chrome';
            }
            const browserClass = 'is-browser--' + browserName;
            window.$('html').addClass(browserClass);
            window.$('body').addClass(browserClass);
        });
    },
};
