(() => {
    'use strict';
    if (window.amznads) { return; }
    const noop = () => {};
    const noopHandler = {
        get: () => {
            return noop;
        }
    };
    window.amznads = new Proxy({}, noopHandler);
    window.amzn_ads = (window.amzn_ads === undefined) ? noop : window.amzn_ads;
    window.aax_write = (window.aax_write === undefined) ? noop : window.aax_write;
    window.aax_render_ad = (window.aax_render_ad === undefined) ? noop : window.aax_render_ad;
})();
