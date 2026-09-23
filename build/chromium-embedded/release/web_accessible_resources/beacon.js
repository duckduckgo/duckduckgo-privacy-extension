(() => {
    'use strict';
    const noop = () => {};
    window.udm_ = noop;
    window._comscore = [];
    window.COMSCORE = {
        beacon: noop,
        purge: () => {
            window._comscore = [];
        }
    };
})();
