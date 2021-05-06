import { Cookie } from './cookie.js'
import { defineProperty } from './utils'

function blockCookies () {
    // disable setting cookies
    defineProperty(document, 'cookie', {
        configurable: false,
        set: function (value) { },
        get: () => ''
    })
}

let loadedPolicyResolve
// Listen for a message from the content script which will configure the policy for this context
const trackerHosts = new Set()

/**
 * Apply an expiry policy to cookies set via document.cookie.
 */
function applyCookieExpiryPolicy () {
    const debug = false
    const cookieSetter = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie').set
    const cookieGetter = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie').get
    const lineTest = /(\()?(http[^)]+):[0-9]+:[0-9]+(\))?/

    const loadPolicy = new Promise((resolve) => {
        loadedPolicyResolve = resolve
    })
    defineProperty(document, 'cookie', {
        configurable: true,
        set: (value) => {
            // call the native document.cookie implementation. This will set the cookie immediately
            // if the value is valid. We will override this set later if the policy dictates that
            // the expiry should be changed.
            cookieSetter.apply(document, [value])
            try {
                // determine the origins of the scripts in the stack
                const stack = new Error().stack.split('\n')
                const scriptOrigins = stack.reduce((origins, line) => {
                    const res = line.match(lineTest)
                    if (res && res[2]) {
                        origins.add(new URL(res[2]).hostname)
                    }
                    return origins
                }, new Set())

                // wait for config before doing same-site tests
                loadPolicy.then(({ shouldBlock, tabRegisteredDomain, policy, isTrackerFrame }) => {
                    if (!tabRegisteredDomain || !shouldBlock) {
                        // no site domain for this site to test against, abort
                        debug && console.log('[ddg-cookie-policy] policy disabled on this page')
                        return
                    }
                    const sameSiteScript = [...scriptOrigins].every((host) => host === tabRegisteredDomain || host.endsWith(`.${tabRegisteredDomain}`))
                    if (sameSiteScript) {
                        // cookies set by scripts loaded on the same site as the site are not modified
                        debug && console.log('[ddg-cookie-policy] ignored (sameSite)', value, [...scriptOrigins])
                        return
                    }
                    const trackerScript = [...scriptOrigins].some((host) => trackerHosts.has(host))
                    if (!trackerScript && !isTrackerFrame) {
                        debug && console.log('[ddg-cookie-policy] ignored (non-tracker)', value, [...scriptOrigins])
                        return
                    }
                    // extract cookie expiry from cookie string
                    const cookie = new Cookie(value)
                    // apply cookie policy
                    if (cookie.getExpiry() > policy.threshold) {
                        // check if the cookie still exists
                        if (document.cookie.split(';').findIndex(kv => kv.trim().startsWith(cookie.parts[0].trim())) !== -1) {
                            cookie.maxAge = policy.maxAge
                            debug && console.log('[ddg-cookie-policy] update', cookie.toString(), scriptOrigins)
                            cookieSetter.apply(document, [cookie.toString()])
                        } else {
                            debug && console.log('[ddg-cookie-policy] dissappeared', cookie.toString(), cookie.parts[0], scriptOrigins)
                        }
                    } else {
                        debug && console.log('[ddg-cookie-policy] ignored (expiry)', value, scriptOrigins)
                    }
                })
            } catch (e) {
                // suppress error in cookie override to avoid breakage
                debug && console.warn('Error in cookie override', e)
            }
        },
        get: cookieGetter
    })
}

// Set up 3rd party cookie blocker
export function load (args) {
    // The cookie expiry policy is injected into every frame immediately so that no cookie will
    // be missed.
    applyCookieExpiryPolicy()
}

export function init (args) {
    loadedPolicyResolve(args.cookie)
    if (window.top !== window && args.cookie.isTrackerFrame && args.cookie.shouldBlock && args.cookie.isThirdParty) {
        // overrides expiry policy with blocking - only in subframes
        blockCookies()
    }
}

export function update (args) {
    if (args.trackerDefinition) {
        trackerHosts.add(args.hostname)
    }
}
