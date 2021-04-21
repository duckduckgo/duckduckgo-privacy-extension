/* global Cookie */
// Set up 3rd party cookie blocker
(function cookieBlocker () {
    // don't inject into non-HTML documents (such as XML documents)
    // but do inject into XHTML documents
    if (document instanceof HTMLDocument === false && (
        document instanceof XMLDocument === false ||
        document.createElement('div') instanceof HTMLDivElement === false
    )) {
        return
    }

    function blockCookies () {
        // disable setting cookies
        document.__defineSetter__('cookie', function (value) { })
        document.__defineGetter__('cookie', () => '')
    }

    /**
     * Apply an expiry policy to cookies set via document.cookie.
     * @param {string} secret Used to detect messages sent from the extension content-script
     */
    function applyCookieExpiryPolicy (secret) {
        const debug = false
        const cookieSetter = document.__lookupSetter__('cookie')
        const cookieGetter = document.__lookupGetter__('cookie')
        const lineTest = /(\()?(http[^)]+):[0-9]+:[0-9]+(\))?/

        // Listen for a message from the content script which will configure the policy for this context
        const trackerHosts = new Set()
        const loadPolicy = new Promise((resolve) => {
            const messageListener = (event) => {
                if (event && event.isTrusted && event.data && event.data.source === secret) {
                    if (event.data.type === 'tracker') {
                        trackerHosts.add(event.data.hostname)
                    } else {
                        resolve(event.data)
                    }
                }
            }
            window.addEventListener('message', messageListener)
        })
        document.__defineSetter__('cookie', (value) => {
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
        })
        document.__defineGetter__('cookie', cookieGetter)
    }

    /**
     * Inject a script to run in the document context.
     * @param {Function} func Function to run
     * @param {string} arg Optional argument to pass to the function
     */
    function inject (func, arg, requires = []) {
        const imports = requires.map(func => func.toString()).join(';\n')
        const scriptString = `{
            ${imports};
            (${func.toString()})('${arg}')
        }`
        const doc = window.wrappedJSObject ? window.wrappedJSObject.document : document
        const scriptElement = doc.createElement('script')
        scriptElement.innerHTML = scriptString
        doc.documentElement.prepend(scriptElement)
        // remove element immediately so it is not visible to scripts on the page
        doc.documentElement.removeChild(scriptElement)
    }

    /**
     * A shared secret between the content script and scripts injected into the document context.
     */
    const MSG_SECRET = `ddg-${Math.floor(Math.random() * 1000000)}`
    // The cookie expiry policy is injected into every frame immediately so that no cookie will
    // be missed.
    inject(applyCookieExpiryPolicy, MSG_SECRET, [Cookie])

    chrome.runtime.sendMessage({
        checkThirdParty: true,
        documentUrl: window.location.href
    }, function (action) {
        if (!action) {
            // action is undefined if the background has not yet registered the message listener
            return
        }
        if (window.top !== window && action.isTrackerFrame && action.shouldBlock && action.isThirdParty) {
            // overrides expiry policy with blocking - only in subframes
            inject(blockCookies)
        }
        // inform the injected script of the policy for this frame
        window.postMessage({
            source: MSG_SECRET,
            ...action
        }, document.location.origin)
    })
    chrome.runtime.onMessage.addListener((message) => {
        // forward tracker messages to the embedded script
        if (message && message.type === 'tracker') {
            window.postMessage({
                source: MSG_SECRET,
                ...message
            })
        }
    })
})()
