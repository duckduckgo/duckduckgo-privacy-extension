'use strict';

(function () {
    chrome.runtime.onMessage.addListener(function(req, sender, res) {
        if (req.trackerBlockingEnabled) {
            console.log("tracker blocking on")
            window.top.postMessage({type: 'blockingActivated'}, req.url)
        } else {
            console.log("tracker blocking off")
        }
    })

    document.querySelectorAll('.js-addons-buttons-activate-blocking').forEach((selector) => {
        selector.addEventListener('click', (e) => {
            chrome.runtime.sendMessage({
                updateSetting: {name: 'trackerBlockingEnabled', value: true}
            })
        })
    })
})()
