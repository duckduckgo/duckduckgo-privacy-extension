class Tabs{
    constructor() {
        this.tabContainer = {},
        this.currentTab = null
    };

    // Add new tab and return tab object
    // checks for an existing tab with the same ID 
    // before creating a new one
    addTab(tabData) {
        let tab = this.getTab(tabData.id);
        if (tab) {
            return tab;
        }
        else {
            let newTab = new Tab(tabData);
            this.tabContainer[tabData.id] = newTab;
            return this.getTab(tabData.id);
        }
    };

    deleteTab(id) {
        delete this.tabContainer[id];
    };

    getTab(id) {
        return this.tabContainer[id] || null;
    };

    // handle onTab updated events. 
    // This event can fire many times during a page load
    updateTab(tabId, newData) {
        let currentData = this.getTab(tabData.id);
        if (currentData) {
            tab.update(newData);
        }
        else {
            console.log("Tabs: updateTab, no tab with id ", tabId);
        }
    };
}

var tabsObj = new Tabs();
