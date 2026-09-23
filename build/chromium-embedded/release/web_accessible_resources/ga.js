(() => {
    'use strict';
    const noop = () => {};
    const noopReturnEmptyArray = () => { return []; };
    const noopHandler = {
        get: function (target, prop) {
            if (typeof target[prop] !== 'undefined') {
                return Reflect.get(...arguments);
            }
            return noop;
        }
    };
    const trackerTarget = {
        _getLinkerUrl: function (arg) { return arg; }
    };
    const gaqTarget = {
        push: function (arg) {
            if (typeof arg === 'function') {
                try {
                    arg();
                } catch (error) {}
                return;
            }
            if (Array.isArray(arg) === false) { return; }
            if (arg[0] === '_link' && typeof arg[1] === 'string') {
                window.location.assign(arg[1]);
            }
            if (arg[0] === '_set' && arg[1] === 'hitCallback' && typeof arg[2] === 'function') {
                try {
                    arg[2]();
                } catch (error) {}
            }
        }
    };
    const gatTarget = {
        _getTracker: function () { return new Proxy(trackerTarget, noopHandler); },
        _getTrackerByName: function () { return new Proxy(trackerTarget, noopHandler); },
        _getTrackers: noopReturnEmptyArray
    };
    const gaqObj = new Proxy(gaqTarget, noopHandler);
    const gatObj = new Proxy(gatTarget, noopHandler);
    window._gat = gatObj;
    const commandQueue = (window._gaq && Array.isArray(window._gaq)) ? window._gaq : [];
    while (commandQueue.length > 0) {
        gaqObj.push(commandQueue.shift());
    }
    window._gaq = gaqObj;
})();
