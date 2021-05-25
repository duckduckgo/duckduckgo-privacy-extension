//google-analytics.com/analytics.js application/javascript
(() => {
    'use strict'
    const noop = () => {}
    const noopReturnNull = () => {
        return null
    }
    const noopHandler = {
        get: function(target, prop) {
            return noop
        }
    }
    const noopReturnArray = () => {
        return []
    }
    const gaPointer = window.GoogleAnalyticsObject = (window.GoogleAnalyticsObject === void 0) ? 'ga' : window.GoogleAnalyticsObject
    const datalayer = window.dataLayer
    // execute callback if exists, see https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#hitCallback
    const ga = function() {
        const params = Array.from(arguments)
        params.forEach((param) => {
            if (param instanceof Object && typeof param.hitCallback === 'function') {
                try {
                    param.hitCallback()
                } catch (error) {}
            }
        })
    }
    const Tracker = new Proxy({}, {
        get(target, prop) {
            if (prop === 'get') {
                return (fieldName) => {
                    if (fieldName === 'linkerParam') {
                        // This fixed string is an example value of this API.
                        // As the extension exposes itself with many featues we shouldn't be concerned by exposing ourselves here also.
                        // If we randomised this to some other fake value there wouldn't be much benefit and could risk being a tracking vector.
                        // https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#linkerParam
                        return '_ga=1.231587807.1974034684.1435105198';
                    }
                    return 'something'
                };
            }
            return noop;
        }
    });
    ga.answer = 42
    ga.loaded = true
    ga.create = function() { return new Proxy({}, noopHandler) }
    ga.getByName = noopReturnNull
    ga.getAll = function() { return [Tracker] }
    ga.remove = noop
    window[gaPointer] = ga
    // prevent page delay, see https://developers.google.com/optimize
    if (datalayer && datalayer.hide && typeof datalayer.hide.end === 'function') {
        try {
            datalayer.hide.end()
        } catch (error) {}
    }
})()
