(function () {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        start()
    } else {
        document.addEventListener('DOMContentLoaded', start)
    }

    function start () {
        window.postMessage({ type: 'onboarding', ready: true }, '*')
    }
})()
