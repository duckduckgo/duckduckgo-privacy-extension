class Tracker {
    constructor (name, url, type) {
        this.parentCompany = Companies.get(name)
        this.urls = [url]
        this.count = 1 // request count
        this.type = type || ''
    }

    increment () {
        this.count += 1
    }

    /* A parent company may try
     * to track you through many different entities.
     * We store a list of all unique urls here.
     */
    addURL (url) {
        if (this.urls.indexOf(url) === -1) {
            this.urls.push(url)
        }
    }
}

/* This class contains information about what trackers and sites
 * are on a given tab:
 *  id: Chrome tab id
 *  url: url of the tab
 *  site: ref to a Site object
 *  trackers: {object} all trackers requested on page/tab (listed by company)
 *  trackersBlocked: {object} tracker instances we blocked on page/tab (listed by company)
 *      both `trackers` and `trackersBlocked` objects are in this format:
 *      {
 *         '<companyName>': {
 *              parentCompany: ref to a Company object
 *              urls: all unique tracker urls we have seen for this company
 *              count: total number of requests to unique tracker urls for this company
 *          }
 *      }
 */
const scoreIconLocations = {
    "A": "img/toolbar-rating-a@2x.png",
    "B": "img/toolbar-rating-b@2x.png",
    "C": "img/toolbar-rating-c@2x.png",
    "D": "img/toolbar-rating-d@2x.png",
    "F": "img/toolbar-rating-f@2x.png"
}

class Tab {
    constructor(tabData) {
        this.id = tabData.id || tabData.tabId
        this.trackers = {}
        this.trackersBlocked = {}
        this.url = tabData.url
        this.upgradedHttps = false
        this.failedUpgradeUrls = {}
        this.httpsRedirects = {} // count redirects here in form of: { <requestId>: <count> }
        this.lastHttpsUpgrade = {}
        this.requestId = tabData.requestId
        this.status = tabData.status
        this.site = new Site(utils.extractHostFromURL(tabData.url))
        this.statusCode // statusCode is set when headers are recieved in tabManager.js
        this.stopwatch = {
            begin: Date.now(),
            end: null,
            completeMs: null
        }
        // set the new tab icon to the dax logo
        chrome.browserAction.setIcon({path: 'img/icon_48.png', tabId: tabData.tabId})
    };

    updateBadgeIcon () {
        if (!this.site.specialDomain() ) {

            if(this.site.isBroken) {
                chrome.browserAction.setIcon({path: 'img/icon_48.png', tabId: this.id});
            } else {
                let scoreIcon
                if (this.site.whitelisted) {
                    scoreIcon = scoreIconLocations[this.site.score.get().before]
                } else {
                    scoreIcon = scoreIconLocations[this.site.score.get().after]
                }

                chrome.browserAction.setIcon({path: scoreIcon, tabId: this.id});
            }
        }
    };

    updateSite () {
        this.site = new Site(utils.extractHostFromURL(this.url))
        // reset badge to dax whenever we go to a new site
        chrome.browserAction.setIcon({path: 'img/icon_48.png', tabId: this.id});
    };

    /* Store all trackers for a given tab even if we
     * don't block them.
     */
    addToTrackers (t) {
        let tracker = this.trackers[t.parentCompany];
        if (tracker) {
            tracker.increment();
            tracker.addURL(t.url);
        }
        else {
            let newTracker = new Tracker(t.parentCompany, t.url, t.type);
            this.trackers[t.parentCompany] = newTracker;

            // first time we have seen this network tracker on the page
            if (t.parentCompany !== 'unknown') Companies.countCompanyOnPage(t.parentCompany)

            return newTracker;
        }
    };

    addOrUpdateTrackersBlocked (t) {
        let tracker = this.trackersBlocked[t.parentCompany];
        if (tracker) {
            tracker.increment();
            tracker.addURL(t.url);
        }
        else {
            let newTracker = new Tracker(t.parentCompany, t.url, t.type);
            this.trackersBlocked[t.parentCompany] = newTracker;
            return newTracker;
        }
    };

    downgradeHttpsUpgradeRequest (reqData) {
        if (reqData.type === 'main_frame') this.upgradedHttps = false
        delete this.httpsRedirects[reqData.requestId]
        const downgrade = reqData.url.replace(/^https:\/\//i, 'http://')
        this.failedUpgradeUrls[downgrade] = true
        return downgrade
    }

    checkHttpsRequestsOnComplete () {
        // TODO later: watch all requests for http/https status and
        // report mixed content
    }

    endStopwatch () {
        this.stopwatch.end = Date.now()
        this.stopwatch.completeMs = (this.stopwatch.end - this.stopwatch.begin)
        console.log(`tab.status: complete. site took ${this.stopwatch.completeMs/1000} seconds to load.`)
    }
}

chrome.webRequest.onBeforeRedirect.addListener((req) => {
    // count redirects
    let tab = tabManager.get({'tabId': req.tabId})
    if (!tab) return

    if (tab.httpsRedirects[req.requestId]) {
        tab.httpsRedirects[req.requestId] += 1
    } else {
        tab.httpsRedirects[req.requestId] = 1
    }
}, {urls: ["*://*/*"]})
