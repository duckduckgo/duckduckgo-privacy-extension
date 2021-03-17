/**
* This is only used on https://duckduckgo.com/ to capture some variable
* as _early_ as possible in the page lifecycle
*/
(function () {
    const hadFocusOnStart = document.hasFocus()

    window.addEventListener('message', function handleMessage (e) {
        if (e.origin === 'https://duckduckgo.com' && e.data.type === 'documentStartDataRequest') {
            window.removeEventListener('message', handleMessage)
            e.source.postMessage({ type: 'documentStartDataResponse', payload: { hadFocusOnStart } }, e.origin)
        }
    })
})()
