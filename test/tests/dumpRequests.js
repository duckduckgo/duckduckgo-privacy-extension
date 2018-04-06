// Grade details test
var PARAMS = getParams();

let siteDetails = [ ];

$(document).ready(function() {
    /*
     * Get test params from the url and set any defaults
     */
    if (PARAMS.url) {
        bkg.settings.ready()
            .then(() => {
                bkg.settings.updateSetting('dumpRequests', true)

                return Promise.resolve()
            })
            .then(waitForHTTPSToLoad)
            .then(runTest(PARAMS.url)
            .then(() => {

                if (PARAMS.json) {
                    $('body').append(`<div id="json-data">${JSON.stringify(siteDetails, null, 4)}</div>`);
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
                let tabObj = bkg.tabManager.get({'tabId': tab.id});

                siteDetails.push({
                    url: url,
                    requests: tabObj.site.requests
                })

                chrome.tabs.remove(tab.id);
                resolve()
            })
        });
    });
}
