(() => {
    'use strict';
    const noop = () => {};
    const noopHandler = {
        get: () => {
            return noop;
        }
    };
    const noopProxy = new Proxy({}, noopHandler);
    window.pSUPERFLY = noopProxy;
    window.pSUPERFLY_mab = noopProxy;
})();
