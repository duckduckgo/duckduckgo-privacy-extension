let params = getParams()
let blocked = []
let bkg = chrome.extension.getBackgroundPage()
let trackersToTest = []

/* Visit site to get a list of all blocked trackers
 */
getTabObject(params.site).then((tab) => {
    // close the tab we created
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

function runTest(trackerToUnblock) {

    if (trackersToTest.length === 0) return

    bkg.debugRequest = trackerToUnblock

    getTabObject(params.site).then((tab) => {
        console.log("Unblocked: ", bkg.debugRequest)
        console.log("Site: ", tab)
        chrome.tabs.remove(tab.id)
        runTest(trackersToTest.pop())
    })
}
