/**
* This is only used on duckduckgo.com to assist with user onboarding
* when Chrome displays a native "Change back to Google Search" dialogue
*/
(function () {
    const hadFocusOnStart = document.hasFocus()
    window.addEventListener('message', function handleMessage (event) {
        if (event.origin === window.location.origin && event.data.type === 'documentStartDataRequest') {
            window.removeEventListener('message', handleMessage)
            event.source.postMessage({ type: 'documentStartDataResponse', payload: { hadFocusOnStart } }, event.origin)
        }
    })
})()
