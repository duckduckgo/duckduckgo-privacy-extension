(function () {
    // Note: this is injected by atb.es6.js
    // This is currently used for the cross product promotion on desktop experiment.
    // For this experiment we need to notify the page when the extension has been
    // successfully installed
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        start()
    } else {
        document.addEventListener('DOMContentLoaded', start)
    }

    function start () {
        window.postMessage({ type: 'onboarding', ready: true }, '*')
    }
})()
