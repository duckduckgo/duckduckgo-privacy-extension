(function () {
    // Note: this is only used on duckduckgo.com to assist with user onboarding
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        start()
    } else {
        document.addEventListener('DOMContentLoaded', start)
    }

    function start () {
        window.postMessage(
            { type: 'onboarding', ready: true },
            // Note: the line below is replaced by the Gruntfile so that this
            // can be easily tested in local dev.
            // Do not edit the /* __ */ and  /* __ */
            /* __ */ 'https://duckduckgo.com' /* __ */
        )
    }
})()
