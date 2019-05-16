'use strict';

(function () {
    chrome.runtime.onMessage.addListener((req, sender, res) => {
        if (req.trackerBlockingEnabled) {
            window.top.postMessage({type: 'blockingActivated'}, req.url)
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
