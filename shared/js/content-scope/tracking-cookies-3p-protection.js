import { defineProperty } from './utils'

function blockCookies () {
    // disable setting cookies
    defineProperty(document, 'cookie', {
        configurable: false,
        set: function (value) { },
        get: () => ''
    })
}

export function init (args) {
    args.cookie.debug = args.debug
    if (window.top !== window && args.cookie.isTrackerFrame && args.cookie.shouldBlock && args.cookie.isThirdParty) {
        // overrides expiry policy with blocking - only in subframes
        blockCookies()
    }
}
