class trackerObj {
    constructor(name, url, type) {
        this.name = name,
        this.url = url,
        this.type = type || 'unknown',
        this.count = 1;
    };
    
    increment() {
            this.count += 1;
    };

}

class Tab {
    constructor(tabData) {
        this.id = tabData.id || tabData.tabId,
        this.total = 0,
        this.url = tabData.url,
        this.trackers = {},
        this.dispTotal = function(){ return Object.keys(this.trackers).length},
        this.status = tabData.status,
        this.site = Sites.get(utils.extractHostFromURL(tabData.url));
    };

    addOrUpdateTracker(name, url, type) {
        let tracker = this.trackers[name];
        if (tracker) {
            tracker.increment();
        }
        else {
            let newTracker = new trackerObj(name, url, type);
            this.trackers[name] = newTracker;
            return newTracker;
        }
    }
}
