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
    ga.answer = 42
    ga.loaded = true
    ga.create = function() { return new Proxy({}, noopHandler) }
    ga.getByName = noopReturnNull
    ga.getAll = noopReturnArray
    ga.remove = noop
    window[gaPointer] = ga
    // prevent page delay, see https://developers.google.com/optimize
    if (datalayer && datalayer.hide && typeof datalayer.hide.end === 'function') {
        try {
            datalayer.hide.end()
        } catch (error) {}
    }
})()
