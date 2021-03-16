//outbrain.com/outbrain.js application/javascript
(() => {
    'use strict'
    const noop = () => {}
    const noopHandler = {
        get: () => {
            return noop
        }
    }
    const noopObrExternHandler = {
        get: function(target, prop, receiver) {
            if (prop === 'video' || prop === 'feed' || prop === 'recReasons') {
                return Reflect.get(...arguments)
            }
            return noop
        }
    }
    const noopProxy = new Proxy({}, noopHandler)
    const obrExternTarget = {
        video: {
            getVideoRecs: noop,
            initInPlayerWidget: noop,
            videoClicked: noop
        },
        feed: {
            loadNextChunk: noop
        },
        recReasons: {
            backFromScopedWidget: noop,
            loadScopedWidget: noop,
            onRecFollowClick: noop,
            onRecLinkHover: noop,
            onRecLinkHoverOut: noop
        }
    }
    const obrObj = {
        ready: true,
        error: noop,
        extern: new Proxy(obrExternTarget, noopObrExternHandler),
        display: noopProxy,
        controller: noopProxy,
        printLog: noop,
        IntersectionObserver: noop,
        proxy: noopProxy,
        languageManager: noopProxy
    }
    window['OBR$'] = noop
    window.OB_releaseVer = '200037'
    window.OBR = (window.OBR === void 0) ? obrObj : window.OBR
    window.OB_PROXY = (window.OB_PROXY === void 0) ? noopProxy : window.OB_PROXY
    window.outbrain = (window.outbrain === void 0) ? noopProxy : window.outbrain
    window.outbrain_rater = (window.outbrain_rater === void 0) ? noopProxy : window.outbrain_rater
})()
