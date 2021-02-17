module.exports = {
    setBrowserClassOnBodyTag: function () {
        const browserClass = 'is-browser--' + 'safari';
        window.$('html').addClass(browserClass);
        window.$('body').addClass(browserClass);
    }
};
