(function () {
    // Note: this is only used on duckduckgo.com to assist with user onboarding
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        start()
    } else {
        document.addEventListener('DOMContentLoaded', start)
    }

    function start () {
        window.postMessage({ type: 'onboarding', ready: true }, '*')
    }
})()
