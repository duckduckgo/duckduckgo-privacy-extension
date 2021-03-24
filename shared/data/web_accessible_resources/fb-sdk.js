//facebook.net/sdk.js application/javascript
(() => {
    'use strict'
    const originalFBURL = document.currentScript.src
    let siteInit = function () {}
    let fbIsEnabled = false
    const parseCalls = []
    const popupName = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 12)

    const fbLogin = {
        callback: function () {},
        params: undefined
    }

    function messageAddon (detailObject) {
        detailObject.entity = 'Facebook'
        const event = new CustomEvent('ddgClickToLoad', {
            detail: detailObject,
            bubbles: false,
            cancelable: false,
            composed: false
        })
        dispatchEvent(event)
    }

    function enableFacebookSDK () {
        if (!fbIsEnabled) {
            window.FB = undefined
            const fbScript = document.createElement('script')
            fbScript.src = originalFBURL
            fbScript.onload = function () {
                for (const node of parseCalls) {
                    window.FB.XFBML.parse.apply(window.FB.XFBML, node)
                }
            }
            document.head.appendChild(fbScript)
            fbIsEnabled = true
        }
    }

    function runFacebookLogin () {
        enableFacebookSDK()
        replaceWindowOpen()
        loginPopup()
        window.fbAsyncInit = function () {
            siteInit()
            window.FB.login(fbLogin.callback, fbLogin.params)
        }
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

    window.addEventListener('LoadFacebookSDK', enableFacebookSDK)
    window.addEventListener('RunFacebookLogin', runFacebookLogin)

    function init () {
        if (window.fbAsyncInit) {
            siteInit = window.fbAsyncInit
            window.fbAsyncInit()
        }
    }

    if (!window.FB) {
        window.FB = {
            init: function (obj) {
                messageAddon({
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
            getLoginStatus: function (callback) { callback({status: ''}) },
            getUserID: function () {},
            login: function (cb, params) {
                fbLogin.callback = cb
                fbLogin.params = params
                messageAddon({
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
