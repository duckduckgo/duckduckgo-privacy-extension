class Tracker {
    constructor(name, url, type) {
        this.parent = Companies.get(name);
        this.urls = [url],
        this.count = 1;
    };
    
    increment() {
            this.count += 1;
    };

    addURL(url) {
        if (this.urls.indexOf(url) === -1) {
            this.urls.push(url);
        }
    };
}

class Tab {
    constructor(tabData) {
        this.id = tabData.id || tabData.tabId,
        this.potentialBlocked = {},
        this.url = tabData.url,
        this.trackers = {},
        this.status = tabData.status,
        this.site = Sites.get(utils.extractHostFromURL(tabData.url));

        this.dispTotal = function(){
            let total = 0;
            for (var tracker in this.trackers) {
                total += this.trackers[tracker].urls.length;
            }
            return total;
        };
    };

    addToPotentialBlocked(url) {
        this.potentialBlocked[url] = null;
    };

    addOrUpdateTracker(name, url, type) {
        let tracker = this.trackers[name];
        if (tracker) {
            tracker.increment();
            tracker.addURL(url);
        }
        else {
            let newTracker = new Tracker(name, url, type);
            this.trackers[name] = newTracker;
            return newTracker;
        }
    }
}
