'use strict';

(function () {
    document.getElementById('blocking-toggle').addEventListener('click', function() {
        chrome.runtime.sendMessage({
            updateSetting: {name: 'trackerBlockingEnabled', value: true}
        })
    })

})()
