/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Partially based on https://searchfox.org/mozilla-central/source/browser/extensions/webcompat/shims/google-analytics-and-tag-manager.js

(() => {
    'use strict';
    const noop = () => {};
    const noopHandler = {
        get: function (target, prop) {
            return noop;
        }
    };
    const gaPointer = window.GoogleAnalyticsObject = (window.GoogleAnalyticsObject === undefined) ? 'ga' : window.GoogleAnalyticsObject;
    const datalayer = window.dataLayer;

    const Tracker = new Proxy({}, {
        get (target, prop) {
            if (prop === 'get') {
                return (fieldName) => {
                    if (fieldName === 'linkerParam') {
                        // This fixed string is an example value of this API.
                        // As the extension exposes itself with many featues we shouldn't be concerned by exposing ourselves here also.
                        // If we randomised this to some other fake value there wouldn't be much benefit and could risk being a tracking vector.
                        // https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#linkerParam
                        return '_ga=1.231587807.1974034684.1435105198';
                    }
                    return 'something';
                };
            }
            return noop;
        }
    });

    let callQueue = null;
    if (window[gaPointer] && Array.isArray(window[gaPointer].q)) {
        callQueue = window[gaPointer].q;
    }

    // Execute callback if exists.
    // Note: There are other ways of using the API that aren't handled here yet.
    const ga = function () {
        const params = Array.from(arguments);

        if (params.length === 1 && typeof params[0] === 'function') {
            try {
                params[0](Tracker);
            } catch (error) {}
            return undefined;
        }

        // See https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#hitCallback
        params.forEach((param) => {
            if (param instanceof Object && typeof param.hitCallback === 'function') {
                try {
                    param.hitCallback();
                } catch (error) {}
            }
        });
    };
    ga.answer = 42;
    ga.loaded = true;
    ga.create = function () { return new Proxy({}, noopHandler); };
    ga.getByName = function () { return new Proxy({}, noopHandler); };
    ga.getAll = function () { return [Tracker]; };
    ga.remove = noop;
    window[gaPointer] = ga;
    // prevent page delay, see https://developers.google.com/optimize
    if (datalayer && datalayer.hide && typeof datalayer.hide.end === 'function') {
        try {
            datalayer.hide.end();
        } catch (error) {}
    }

    if (!(window.gaplugins && window.gaplugins.Linker)) {
        window.gaplugins = window.gaplugins || {};
        window.gaplugins.Linker = class {
            autoLink () {}

            decorate (url) {
                return url;
            }

            passthrough () {}
        };
    }

    if (callQueue) {
        for (const args of callQueue) {
            try {
                ga(...args);
            } catch (e) { }
        }
    }
})();
