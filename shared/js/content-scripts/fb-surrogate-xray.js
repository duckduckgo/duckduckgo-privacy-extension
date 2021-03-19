(function injectFBSurrogateWithXRay () {
    const wrappedWindow = window.wrappedJSObject
    let capturedFBURL
    let siteInit = function () {}
    let fbIsEnabled = false
    const parseCalls = []
    let fbLogin = {
        callback: function () {},
        params: undefined
    }

    function enableFacebookSDK () {
        if (!fbIsEnabled) {
            wrappedWindow.FB = cloneInto(
                undefined,
                window)
            const fbScript = document.createElement('script')
            fbScript.src = getSDKUrl()
            fbScript.onload = function () {
                for (const node of parseCalls) {
                    window.FB.XFBML.parse.apply(window.FB.XFBML, node)
                }
            }
            document.head.appendChild(fbScript)
            fbIsEnabled = true
        }
    }

    /* Attempt to find the SDK url being used by the site.
     * This will fail when the script is dynamically loaded (via another script)
     */
    function getSDKUrl () {
        // See if a call has been captured
        if (capturedFBURL) {
            return capturedFBURL
        }
        // start with the default
        let source = 'https://connect.facebook.net/en_US/sdk.js?XFBML=false'
        // try scripts
        const scripts = document.querySelectorAll('script')
        for (const script of scripts) {
            const url = script.getAttribute('src')
            if (url && url.match(/connect.facebook.net\/[a-zA-Z_]+\/(sdk|all).js/)) {
                source = url
            }
        }
        return source
    }

    /*
     * Watch resource loads from the site, looking for an SDK call (in case of dynamic script loading)
     */
    function facebookObserver (list, observer) {
        const resourceLoads = list.getEntriesByType('resource')
        for (const resource of resourceLoads) {
            if (resource.name.match(/connect.facebook.net\/[a-zA-Z_]+\/(sdk|all).js/)) {
                capturedFBURL = resource.name
            }
        }
    }
    const observer = new PerformanceObserver(facebookObserver)
    observer.observe({ entryTypes: ['resource'] })

    function runFacebookLogin () {
        const wrappedInit = function () {
            siteInit()
            wrappedWindow.FB.login(fbLogin.callback, fbLogin.params)
        }

        wrappedWindow.fbAsyncInit = cloneInto(
            wrappedInit,
            window,
            {cloneFunctions: true})
        enableFacebookSDK()
    }

    function initSurrogate () {
        if (wrappedWindow.fbAsyncInit) {
            siteInit = wrappedWindow.fbAsyncInit
            wrappedWindow.fbAsyncInit()
        }
    }

    window.addEventListener('LoadFacebookSDK', enableFacebookSDK)
    window.addEventListener('RunFacebookLogin', runFacebookLogin)

    if (!wrappedWindow.FB) {
        const FB = {
            messageAddon: function (detailObject) {
                detailObject.entity = 'Facebook'
                const event = new CustomEvent('ddgClickToLoad', {
                    detail: detailObject,
                    bubbles: true,
                    cancelable: false,
                    composed: false
                })
                dispatchEvent(event)
            },
            init: function (obj) {
                FB.messageAddon({
                    'appID': obj.appId
                })
            },
            ui: function (obj, cb) {
                cb({})
            },
            getAccessToken: function () {},
            getAuthResponse: function () {
                return {status: ''}
            },
            getLoginStatus: function (callback) {callback({status: ''})},
            getUserID: function () {},
            login: function (cb, params) {
                fbLogin.callback = cb
                fbLogin.params = params
                FB.messageAddon({
                    'action': 'login'
                })
            },
            logout: function () {},
            AppEvents: {
                EventNames: {},
                logEvent: function (a, b, c) {},
                logPageView: function () {}
            },
            Event: {
                subscribe: function () {},
                unsubscribe: function () {}
            },
            XFBML: {
                parse: function (n) {
                    parseCalls.push(n)
                }
            }
        }

        wrappedWindow.FB = cloneInto(
            FB,
            window,
            {cloneFunctions: true})

        console.log('in FB surrogate - special')

        if (document.readyState === 'complete') {
            initSurrogate()
        } else {
            // sdk script loaded before page content, so wait for load.
            window.addEventListener('load', (event) => {
                initSurrogate()
            })
        }
    }
})()
