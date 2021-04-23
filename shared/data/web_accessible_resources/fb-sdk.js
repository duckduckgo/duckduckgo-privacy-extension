//facebook.net/sdk.js application/javascript
(() => {
    'use strict'
    const originalFBURL = document.currentScript.src
    let siteInit = function () {}
    let fbIsEnabled = false
    let initData = {}
    const parseCalls = []
    const popupName = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 12)

    const fbLogin = {
        callback: function () {},
        params: undefined,
        shouldRun: false
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

            window.fbAsyncInit = function () {
                if (initData) {
                    window.FB.init(initData)
                }
                siteInit()
                if (fbLogin.shouldRun) {
                    window.FB.login(fbLogin.callback, fbLogin.params)
                }
            }

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
            api: function () {},
            init: function (obj) {
                if (obj) {
                    initData = obj
                    messageAddon({
                        'appID': obj.appId
                    })
                }
            },
            ui: function (obj, cb) {
                if (obj.method && obj.method === 'share') {
                    const shareLink = 'https://www.facebook.com/sharer/sharer.php?u=' + obj.href
                    window.open(shareLink, 'share-facebook', 'width=550,height=235')
                }
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
