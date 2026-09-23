(() => {
    const noop = () => {};
    const cxApiHandler = {
        get: function (target, prop) {
            if (typeof target[prop] !== 'undefined') {
                return Reflect.get(...arguments);
            }
            return noop;
        }
    };
    const cxApiTarget = {
        chooseVariation: () => { return 0; }
    };
    window.cxApi = new Proxy(cxApiTarget, cxApiHandler);
})();
