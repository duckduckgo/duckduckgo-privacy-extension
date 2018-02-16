/*
 * Sends the tracker metrics to the user via Textile pass-through API
 *
 * This will be browserifyed and turned into email.js by running 'grunt'
 */

require.scopes.email = ( () => {

    const ONEDAY = 1000 * 60 * 60 * 24;

    function sendMetrics() {

        chrome.storage.local.get(function (result) {

            var payload = {
                companyData: result.companyData,
                totalPages: result.totalPages,
                totalPagesWithTrackers: result.totalPagesWithTrackers
            }

            var xhr = new XMLHttpRequest()
            xhr.open('PUT', 'http://localhost:8000/metrics')
            xhr.setRequestHeader('Content-Type', 'application/json')
            xhr.onerror = function (err) {
                console.error('Error sending tracker metrics: ' + err)
            }
            xhr.send(JSON.stringify(payload))
            xhr.onreadystatechange = function() {
                let done = XMLHttpRequest.DONE ? XMLHttpRequest.DONE : 4
                if (xhr.readyState === done && xhr.status === 201) {
                    console.log('Sent tracker metrics')
                }
            }

        })
    }

    // Make sure the list updater runs on start up
    // settings.ready().then(() => updateLists())

    chrome.alarms.onAlarm.addListener(alarm => {
        if (alarm.name === 'sendMetrics') {
            settings.ready().then(() => sendMetrics())
        }
    })

    // set an alarm to recheck the lists
    // update every 30 min
    chrome.alarms.create('sendMetrics', {periodInMinutes: 1})

    // Send immediately for debugging, disable before going live
    settings.ready().then(() => sendMetrics())

    return {
        sendMetrics: sendMetrics
    }

})();
