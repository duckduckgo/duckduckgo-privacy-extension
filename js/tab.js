class trackerObj {
    constructor(name, url, type) {
        this.name = name,
        this.url = url,
        this.type = type || 'unknown',
        this.count = 0;
    };
    
    increment() {
            this.count += 1;
    };

}

class Tab {
    constructor(tabData) {
        this.total = tabData['total'] || 0,
        this.url = tabData['url'],
        this.dispTotal = tabData['dispTota'] || 0,
        this.trackers = tabData['trackers'] || {},
        this.status = tabData['status'];
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
