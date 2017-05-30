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
 *  trackers: container of tracker instances 
 *      parentCompany -> ref to a Company object
 *      urls: all tracker urls we have seen for this company
 *      count: total number of requests
 *  site: ref to a Site object
 */
class Tab {
    constructor(tabData) {
        this.id = tabData.id || tabData.tabId,
        this.potentialBlocked = {},
        this.url = tabData.url,
        this.upgradedHttps = false,
        this.requestId = tabData.requestId,
        this.trackers = {},
        this.status = tabData.status,
        this.site = Sites.get(utils.extractHostFromURL(tabData.url));
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
