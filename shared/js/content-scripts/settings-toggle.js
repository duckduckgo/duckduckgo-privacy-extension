'use strict';

(function () {
    document.querySelectorAll('.js-addons-activate-blocking').forEach((selector) => {
        selector.addEventListener('click', (e) => {
            chrome.runtime.sendMessage({
                updateSetting: {name: 'trackerBlockingEnabled', value: true}
            })
        })
    })

})()
