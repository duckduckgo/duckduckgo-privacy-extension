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
    "A": "img/Grade-A-gray@2x.png",
    "B": "img/Grade-B-gray@2x.png",
    "C": "img/Grade-C-gray@2x.png",
    "D": "img/Grade-D-gray@2x.png",
    "F": "img/Grade-F-gray@2x.png"
}
const defaultIcon = 'img/ddg-icon@2x.png'

class Tab {
    constructor(tabData) {
        this.id = tabData.id || tabData.tabId
        this.trackers = {}
        this.trackersBlocked = {}
        this.url = tabData.url
        this.upgradedHttps = false
        this.httpsRequests = []
        this.httpsRedirects = {}
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
        utils.setBadgeIcon(defaultIcon, tabData.target)

    };

    // update badge icon needs a safari target tab so we can find the correct tab and window
    updateBadgeIcon (target) {
        if (!this.site.specialDomain() ) {

            if(this.site.isBroken) {
                utils.setBadgeIcon(defaultIcon, target)
            } else {
                let scoreIcon
                if (this.site.whitelisted) {
                    scoreIcon = scoreIconLocations[this.site.score.get().before]
                } else {
                    scoreIcon = scoreIconLocations[this.site.score.get().after]
                }
                utils.setBadgeIcon(scoreIcon, target)
            }
        }
    };

    updateSite () {
        this.site = new Site(utils.extractHostFromURL(this.url))
        // reset badge to dax whenever we go to a new site
        utils.setBadgeIcon(defaultIcon, target)
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

    addHttpsUpgradeRequest (upgradedUrl, originalUrl) {
        this.httpsRequests.push(upgradedUrl)

        // keep track on the safari tab:
        let safariTab = this.getSafariTab()
        if (!safariTab.ddgHttpsRedirects) {
            safariTab.ddgHttpsRedirects = {}
        }
        safariTab.ddgHttpsRedirects[originalUrl] = 1
    }

    hasUpgradedUrlAlready (url) {
        let safariTab = this.getSafariTab()
        return safariTab.ddgHttpsRedirects && safariTab.ddgHttpsRedirects[url]
    }

    downgradeHttpsUpgradeRequest (reqData) {
        if (reqData.type === 'main_frame') this.upgradedHttps = false
        delete this.httpsRedirects[reqData.requestId]
        const downgrade = reqData.url.replace(/^https:\/\//i, 'http://')
        return downgrade
    }

    checkHttpsRequestsOnComplete () {
        // TODO later: watch all requests for http/https status and
        // report mixed content
    }

    getSafariTab () {
        let safariTab

        safari.application.browserWindows.some((w) => {
            return w.tabs.some((t) => {
                if (t.ddgTabId === this.id) {
                    return safariTab = t
                }
            })
        })

        return safariTab
    }

    endStopwatch () {
        this.stopwatch.end = Date.now()
        this.stopwatch.completeMs = (this.stopwatch.end - this.stopwatch.begin)
        console.log(`tab.status: complete. site took ${this.stopwatch.completeMs/1000} seconds to load.`)
    }
}
