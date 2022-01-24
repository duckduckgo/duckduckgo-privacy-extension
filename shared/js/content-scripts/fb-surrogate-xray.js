(function injectFBSurrogateWithXRay () {
    const wrappedWindow = window.wrappedJSObject
    let capturedFBURL
    const entity = 'Facebook'
    let siteInit = function () {}
    let fbIsEnabled = false
    let initData
    const parseCalls = []
    const fbLogin = {
        callback: function () {},
        params: undefined,
        shouldRun: false
    }

    // use default patterns for the SDK
    let sdkPatterns = [/connect.facebook.net\/[a-zA-Z_]+\/(sdk|all).js/]
    // Request list of rules to capture from the extension
    chrome.runtime.sendMessage({
        messageType: 'getSocialSurrogateRules',
        options: entity
    }, function (response) {
        sdkPatterns = response
    })

    function enableFacebookSDK () {
        if (!fbIsEnabled) {
            /* eslint-disable no-undef */
            wrappedWindow.FB = cloneInto(
                undefined,
                window)
            const wrappedInit = function () {
                if (initData) {
                    wrappedWindow.FB.init(initData)
                }
                siteInit()
                if (fbLogin.shouldRun) {
                    wrappedWindow.FB.login(fbLogin.callback, fbLogin.params)
                }
            }

            /* eslint-disable no-undef */
            wrappedWindow.fbAsyncInit = cloneInto(
                wrappedInit,
                window,
                { cloneFunctions: true })

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

    /*
     * Attempt to find the SDK url being used by the site. Falls back to standard if it can't find
     * one the site uses.
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
            sdkPatterns.forEach(pattern => {
                if (url && url.match(pattern)) {
                    source = url
                }
            })
        }
        return source
    }

    /*
     * Watch resource loads from the site, looking for an SDK call (in case of dynamic script loading)
     */
    function facebookObserver (list, observer) {
        const resourceLoads = list.getEntriesByType('resource')
        for (const resource of resourceLoads) {
            sdkPatterns.forEach(pattern => {
                if (resource.name.match(pattern)) {
                    capturedFBURL = resource.name
                }
            })
        }
    }
    const observer = new PerformanceObserver(facebookObserver)
    observer.observe({ entryTypes: ['resource'] })

    function runFacebookLogin () {
        fbLogin.shouldRun = true
        enableFacebookSDK()
    }

    function initSurrogate () {
        if (wrappedWindow.fbAsyncInit) {
            siteInit = wrappedWindow.fbAsyncInit
            wrappedWindow.fbAsyncInit()
        }
        window.addEventListener('ddg-ctp-load-sdk', event => {
            if (event.detail.entity === 'Facebook') {
                enableFacebookSDK()
            }
        })
        window.addEventListener('ddg-ctp-run-login', event => {
            if (event.detail.entity === 'Facebook') {
                runFacebookLogin()
            }
        })
    }

    if (!wrappedWindow.FB) {
        const FB = {
            messageAddon: function (detailObject) {
                detailObject.entity = 'Facebook'
                const event = new CustomEvent('ddg-ctp', {
                    detail: detailObject,
                    bubbles: true,
                    cancelable: false,
                    composed: false
                })
                dispatchEvent(event)
            },
            api: function () {},
            init: function (obj) {
                if (obj) {
                    initData = obj
                    FB.messageAddon({
                        appID: obj.appId
                    })
                }
            },
            ui: function (obj, sitecallback) {
                sitecallback({})
            },
            getAccessToken: function () {},
            getAuthResponse: function () {
                return { status: '' }
            },
            getLoginStatus: function (sitecallback) { sitecallback({ status: '' }) },
            getUserID: function () {},
            login: function (cb, params) {
                fbLogin.callback = cb
                fbLogin.params = params
                FB.messageAddon({
                    action: 'login'
                })
            },
            logout: function () {},
            AppEvents: {
                EventNames: {},
                logEvent: function (a, b, c) {},
                logPageView: function () {}
            },
            Event: {
                subscribe: function (event, callback) {
                    if (event === 'xfbml.render') {
                        callback()
                    }
                },
                unsubscribe: function () {}
            },
            XFBML: {
                parse: function (n) {
                    parseCalls.push(n)
                }
            }
        }
        /* eslint-disable no-undef */
        wrappedWindow.FB = cloneInto(
            FB,
            window,
            { cloneFunctions: true })

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
