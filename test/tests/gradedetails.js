// Grade details test
var PARAMS = getParams();

let siteDetails = [ ];

$(document).ready(function() {

    /*
     * Get test params from the url and set any defaults
     */
    if (PARAMS.url) {
        waitForHTTPSToLoad()
            .then(runTest(PARAMS.url).then(() => {

                if (PARAMS.json) {
                    $('#gradedetails').append(`<div id="json-data">${JSON.stringify(siteDetails, null, 4)}</div>`);
                    // $('#json-data').append(`${JSON.stringify(siteDetails, null, 4)}`)
                }
            }))
        return;
    }
});

function waitForHTTPSToLoad() {
    return new Promise((resolve) => {
        let list = bkg.https.getUpgradeList()

        if (list && list.length) {
            resolve();
        } else {
            setTimeout(() => {
                waitForHTTPSToLoad().then(resolve);
            }, 1000);
        }

    });
}

/*
 * Navigate to a url
 */
function runTest(url) {
    return new Promise((resolve) => {

        let blockingOnStartTime = Date.now();

        chrome.tabs.create({url}, (t) => {

            getLoadedTabById(t.id, blockingOnStartTime, 20000, 9000).then((tab) => {
                let blocking = bkg.settings.getSetting('trackerBlockingEnabled')
                let tabObj = bkg.tabManager.get({'tabId': tab.id});

                if (blocking) {
                    siteDetails.push({
                        url: url,
                        scoreObj: tabObj.site.score,
                        score: tabObj.site.score.get(),
                        httpsDecisions: tabObj.httpsDecisions,
                        trackers: tabObj.site.trackers,
                        trackersNotBlocked: tabObj.site.trackersNotBlocked
                    })
                }

                chrome.tabs.remove(tab.id);
                resolve()
            })
        });
    });
}
