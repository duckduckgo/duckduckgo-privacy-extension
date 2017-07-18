let params = getParams()
let trackersToTest = []
let results = []

// make sure tracker blocking in on
resetSettings(true)

// reset tracker to debug before we start
bkg.debugRequest = false

if (!params.site.match(/^http/)) {
    params.site = `http://${params.site}`
}

/* Visit site to get a list of all blocked trackers from site.trackerUrls.
 * run screenshot tests after we have the list.
 */
getTabObject(params.site).then((tab) => {
    chrome.tabs.remove(tab.id)
    trackersToTest = tab.site.trackerUrls
    runTest(trackersToTest.pop())

})

/* Open a new tab to [url] and wait for it to load.
 * return the site object
 */
function getTabObject(url) {
    return new Promise((resolve) => {
        chrome.tabs.create({url: url}, (tab) => {
            getLoadedTabById(tab.id).then( (completeTab) => {
                resolve(bkg.tabManager.get({tabId: completeTab.id}))
            })
        })
    })
}

/* test unblocking a single request
 * - open new tab
 * - wait for load
 * - take screenshot
 * - continue on to next test or build summary page
 */
function runTest(trackerToUnblock) {

    bkg.debugRequest = [trackerToUnblock]

    // add any unblocked trackers passed in url params
    if (params.unblock) bkg.debugRequest.push(params.unblock)

    getTabObject(params.site).then((tab) => {

        // take screenshot and continue with next test
        takeScreenshot().then((image) => {

            // add the screenshot to our data to display later
            results.push({tracker: trackerToUnblock, image: image})

            chrome.tabs.remove(tab.id)
            
            // run the next test or bail and build the summary page if we're done
            let nextTracker = trackersToTest.pop()
            nextTracker ? runTest(nextTracker) :  buildSummaryPage()
        })
    })
}

/* build the summary page from the results data */
function buildSummaryPage() {
    let content = ''
    params.unblock ? content += `<h2>Unblocking ${params.unblock} for all requests</h2>` : null
    content += '<table>'

    results.forEach((x) => {
        content += `<tr><td><b>Unblocking: <div id='trackerName'><a href="${window.location.href + '&unblock=' + x.tracker}"> ${x.tracker}</a></div></b><td><tr>`
        content += `<tr><td><img src="${x.image}"/><hr><td><tr>`
    });

    $('#screenshots').prepend(content)

    // turn debugging off when we're done
    bkg.debugRequest = false
}
