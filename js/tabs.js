class TabManager {
    constructor() {
        this.tabContainer = {}
    };

    create(tabData) {
        let newTab = new Tab(tabData);
        this.tabContainer[newTab.id] = newTab;
        return newTab;
    };

    delete(id) {
        delete this.tabContainer[id];
    };

    get(tabData) {
        return this.tabContainer[tabData.tabId];
    };
}

var tabManager = new TabManager();

chrome.tabs.onRemoved.addListener( (id, info) => {
    tabManager.delete(id);
});

// create initial tab instance when a new tab is opened
chrome.tabs.onUpdated.addListener( (id, info) => {
    if (!tabManager.get({'tabId': id})) {
        info.id = id;
        tabManager.create(info);
    }
});

