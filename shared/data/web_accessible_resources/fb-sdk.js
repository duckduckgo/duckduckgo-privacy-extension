// facebook.net/sdk.js application/javascript
(() => {
    'use strict'
    const originalFBURL = document.currentScript.src
    let siteInit = function () {}
    let fbIsEnabled = false
    let initData = {}
    let runInit = false
    const parseCalls = []
    const popupName = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 12)

    const fbLogin = {
        callback: function () {},
        params: undefined,
        shouldRun: false
    }

    function messageAddon (detailObject) {
        detailObject.entity = 'Facebook'
        const event = new CustomEvent('ddg-ctp', {
            detail: detailObject,
            bubbles: false,
            cancelable: false,
            composed: false
        })
        dispatchEvent(event)
    }

    /**
     * When setting up the Facebook SDK, the site may define a function called window.fbAsyncInit.
     * Once the SDK loads, it searches for and calls window.fbAsyncInit. However, some sites may
     * not use this, and just call FB.init directly at some point (after ensuring that the script has loaded).
     *
     * Our surrogate (defined below in window.FB) captures calls made to init by page scripts. If at a
     * later point we load the real sdk here, we then re-call init with whatever arguments the page passed in
     * originally. The runInit param should be true when a page has called init directly.
     * Because we put it in asyncInit, the flow will be something like:
     *
     * FB SDK loads -> SDK calls window.fbAsyncInit -> Our function calls window.FB.init (maybe) ->
     * our function calls original fbAsyncInit (if it existed)
     */
    function enableFacebookSDK () {
        if (!fbIsEnabled) {
            window.FB = undefined

            window.fbAsyncInit = function () {
                if (runInit && initData) {
                    window.FB.init(initData)
                }
                siteInit()
                if (fbLogin.shouldRun) {
                    window.FB.login(fbLogin.callback, fbLogin.params)
                }
            }

            const fbScript = document.createElement('script')
            fbScript.setAttribute('crossorigin', 'anonymous')
            fbScript.setAttribute('async', '')
            fbScript.setAttribute('defer', '')
            fbScript.src = originalFBURL
            fbScript.onload = function () {
                for (const node of parseCalls) {
                    window.FB.XFBML.parse.apply(window.FB.XFBML, node)
                }
            }
            document.head.appendChild(fbScript)
            fbIsEnabled = true
        } else {
            if (initData) {
                window.FB.init(initData)
            }
        }
    }

    function runFacebookLogin () {
        fbLogin.shouldRun = true
        replaceWindowOpen()
        loginPopup()
        enableFacebookSDK()
    }

    function replaceWindowOpen () {
        const oldOpen = window.open
        window.open = function (url, name, windowParams) {
            const u = new URL(url)
            if (u.origin === 'https://www.facebook.com') {
                name = popupName
            }
            return oldOpen.call(window, url, name, windowParams)
        }
    }

    function loginPopup () {
        const width = Math.min(window.screen.width, 450)
        const height = Math.min(window.screen.height, 450)
        const popupParams = `width=${width},height=${height},scrollbars=1,location=1`
        window.open('about:blank', popupName, popupParams)
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

    function init () {
        if (window.fbAsyncInit) {
            siteInit = window.fbAsyncInit
            window.fbAsyncInit()
        }
    }

    if (!window.FB) {
        window.FB = {
            api: function () {},
            init: function (obj) {
                if (obj) {
                    initData = obj
                    runInit = true
                    messageAddon({
                        appID: obj.appId
                    })
                }
            },
            ui: function (obj, cb) {
                if (obj.method && obj.method === 'share') {
                    const shareLink = 'https://www.facebook.com/sharer/sharer.php?u=' + obj.href
                    window.open(shareLink, 'share-facebook', 'width=550,height=235')
                }
                // eslint-disable-next-line node/no-callback-literal
                cb({})
            },
            getAccessToken: function () {},
            getAuthResponse: function () {
                return { status: '' }
            },
            // eslint-disable-next-line node/no-callback-literal
            getLoginStatus: function (callback) { callback({ status: '' }) },
            getUserID: function () {},
            login: function (cb, params) {
                fbLogin.callback = cb
                fbLogin.params = params
                messageAddon({
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
        if (document.readyState === 'complete') {
            init()
        } else {
            // sdk script loaded before page content, so wait for load.
            window.addEventListener('load', (event) => {
                init()
            })
        }
    }
})()
