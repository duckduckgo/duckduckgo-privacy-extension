(() => {
    'use strict';
    const noop = () => {};
    const datalayer = window.dataLayer;
    window.ga = (window.ga === undefined) ? noop : window.ga;
    if (datalayer) {
        // execute callback if exists, see https://www.simoahava.com/gtm-tips/use-eventtimeout-eventcallback/
        if (typeof datalayer.push === 'function') {
            datalayer.push = (obj) => {
                if (typeof obj === 'object' && typeof obj.eventCallback === 'function') {
                    const timeout = obj.eventTimeout || 10;
                    try {
                        setTimeout(obj.eventCallback, timeout);
                    } catch (error) {}
                }
            };
        }
        // prevent page delay, see https://developers.google.com/optimize
        if (datalayer.hide && datalayer.hide.end) {
            try {
                datalayer.hide.end();
            } catch (error) {}
        }
    }
})();
