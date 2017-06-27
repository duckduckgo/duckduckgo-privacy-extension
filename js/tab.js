class Tracker {
    constructor(name, url, type) {
        this.parentCompany = Companies.get(name);
        this.urls = [url],
        this.count = 1;
    };

    increment() {
            this.count += 1;
    };

    /* A parent company may try
     * to track you through many different entities.
     * We store a list of all unique urls here.
     */
    addURL(url) {
        if (this.urls.indexOf(url) === -1) {
            this.urls.push(url);
        }
    };
}

/* This class contains information about what trackers and sites
 * are on a given tab:
 *  id: Chrome tab id
 *  url: url of the tab
 *  potentialBlocked: a list of all tracker urls seen
 *  trackers: container of tracker instances we blocked in tab
 *      parentCompany -> ref to a Company object
 *      urls: all tracker urls we have seen for this company
 *      count: total number of requests
 *  site: ref to a Site object
 */
const scoreIconLocations = {
    "A": "img/toolbar-rating-a@2x.png",
    "B": "img/toolbar-rating-b@2x.png",
    "C": "img/toolbar-rating-c@2x.png",
    "D": "img/toolbar-rating-d@2x.png"
}

class Tab {
    constructor(tabData) {
        this.id = tabData.id || tabData.tabId,
        this.potentialBlocked = {},
        this.url = tabData.url,
        this.upgradedHttps = false,
        this.httpsRequests = [],
        this.httpsWhitelisted = false,
        this.requestId = tabData.requestId,
        this.trackers = {},
        this.status = tabData.status,
        this.site = new Site(utils.extractHostFromURL(tabData.url)),

        // set the new tab icon to the dax logo
        chrome.browserAction.setIcon({path: 'img/icon_48.png', tabId: tabData.tabId});
    };

    updateBadgeIcon() {
        if (!this.site.specialDomain()) {
            let scoreIcon = scoreIconLocations[this.site.score.get()];
            chrome.browserAction.setIcon({path: scoreIcon, tabId: this.id});
        }
    };

    updateSite() {
        this.site = new Site(utils.extractHostFromURL(this.url))
        // reset badge to dax whenever we go to a new site
        chrome.browserAction.setIcon({path: 'img/icon_48.png', tabId: this.id});
    };

    /* Add up all of the unique tracker urls that
     * we have see on this tab
     */
    getBadgeTotal() {
        return Object.keys(this.trackers).reduce((total, name) => {
            return this.trackers[name].urls.length + total;
        }, 0);
    };

    /* Store all tracker urls for a given tab even if we
     * don't block them. This is an object for easy look up
     * the null value has no meaning.
     */
    addToPotentialBlocked(url) {
        this.potentialBlocked[url] = null;
    };

    addOrUpdateTracker(t) {
        let tracker = this.trackers[t.parentCompany];
        if (tracker) {
            tracker.increment();
            tracker.addURL(t.url);
        }
        else {
            let newTracker = new Tracker(t.parentCompany, t.url, t.type);
            this.trackers[t.parentCompany] = newTracker;
            return newTracker;
        }
    }
}

chrome.webRequest.onHeadersReceived.addListener((header) => {
    let tab = tabManager.get({'tabId': header.tabId});
    // remove successful rewritten requests 
    if (tab && header.statusCode < 400) {
        tab.httpsRequests = tab.httpsRequests.filter((url) => {
            return url !== header.url;
        });
    }
}, {urls: ['<all_urls>']});
