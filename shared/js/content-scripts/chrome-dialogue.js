/**
* This is only used on duckduckgo.com to assist with user onboarding
* when Chrome displays a native "Change back to Google Search" dialogue
*/
(function () {
    const hadFocusOnStart = document.hasFocus()
    window.addEventListener('message', (event) => {
        if (event.origin === window.location.origin && event.data.type === 'request') {
            event.source.postMessage({ type: 'response', hadFocusOnStart }, event.origin)
        }
    }, false)
})()
