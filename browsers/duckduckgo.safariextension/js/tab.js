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

        // which safari browser window is this tab in
        this.browserWindowId = this.getSafariBrowserWindow(tabData.target)

        // set the new tab icon to the dax logo
        this.setBadgeIcon(defaultIcon)

    };

    getSafariBrowserWindow(target) {
        for(let i = 0; i < safari.extension.toolbarItems.length; i++) {
            if (safari.extension.toolbarItems[i].browserWindow.activeTab === target) {
                return i
            }
        }
    }

    updateBadgeIcon () {
        if (!this.site.specialDomain() ) {

            if(this.site.isBroken) {
                this.setBadgeIcon(defaultIcon)
            } else {
                let scoreIcon
                if (this.site.whitelisted) {
                    scoreIcon = scoreIconLocations[this.site.score.get().before]
                } else {
                    scoreIcon = scoreIconLocations[this.site.score.get().after]
                }
                this.setBadgeIcon(scoreIcon)
            }
        }
    };

    setBadgeIcon (iconPath) {
        if (iconPath) {
            safari.extension.toolbarItems[this.browserWindowId].image = safari.extension.baseURI + iconPath
            safari.extension.popovers[0].contentWindow.location.reload()
        }
    }

    updateSite () {
        this.site = new Site(utils.extractHostFromURL(this.url))
        // reset badge to dax whenever we go to a new site
        this.setBadgeIcon(defaultIcon)
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

    addHttpsUpgradeRequest (url) {
        this.httpsRequests.push(url)
    }

    downgradeHttpsUpgradeRequest (reqData) {
        if (reqData.type === 'main_frame') this.upgradedHttps = false
        delete this.httpsRedirects[reqData.requestId]
        const downgrade = reqData.url.replace(/^https:\/\//i, 'http://')
        return downgrade
    }

    checkHttpsRequestsOnComplete () {
        if (!this.site.HTTPSwhitelisted && this.httpsRequests.length > 0) {

            // set whitelist for all tabs with this domain
            tabManager.whitelistDomain({
                list: 'HTTPSwhitelisted',
                value: true,
                domain: this.site.domain
            });

            this.upgradedHttps = false

            // then reload this tab, downgraded from https to http
            const downgrade = this.url.replace(/^https:\/\//i, 'http://')
            //chrome.tabs.update(this.id, { url: downgrade })
        }
    }

    endStopwatch () {
        this.stopwatch.end = Date.now()
        this.stopwatch.completeMs = (this.stopwatch.end - this.stopwatch.begin)
        console.log(`tab.status: complete. site took ${this.stopwatch.completeMs/1000} seconds to load.`)
    }
}
