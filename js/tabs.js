
require.scopes.tabs = (() => {

    var tabs = {
        currentTab: null
    };

    function tabInitializer(){
        return {
            'trackers': 0,
            'total': 0,
            'url': null,
            'status': null
        }
    };

    function getCurrentTab() {
        return tabs[tabs.currentTab];
    }

    function getTab(tabId) {
        if(!tabId){
            return tabs;
        }
        return tabs[tabId];
    }

    function addTab(tabId, tabData) {
        var newTab = new tabInitializer();
        newTab.url = tabData.url ? tabData.url : null;
        newTab.status = tabData.status;
        tabs[tabId] = newTab;
    }

    function updateTab(tabId, tab) {
        tabs[tabId] = tab;
    }

    function reloadTab(tabId) {
        chrome.tabs.reload(tabs[currentTab]);
    }

    function addToTabWhitelist(url) {
        if(!tabs[tabs.currentTab].whitelist){
            tabs[tabs.currentTab].whitelist = [];
        }
        //var host = blockTrackers.extractHostFromURL(url);
        tabs[tabs.currentTab].whitelist.push(url);
    }

    var onTabUpdated = function(tabId, eventData, tabData) {
        if(/chrome:\/\/newtab/g.exec(tabData.url)){
            return
        }

        if(!tabs[tabId]){
            addTab(tabId, tabData);
        }
        else if(tabs[tabId]){
            var tab = tabs[tabId];
            tab.status =tabData.status;
            tab.url = tabData.url ? tabData.url : tab.url;
            updateTab(tabId, tab);
        }
    }

    var onTabRemoved = function(tabId) {
        delete tabs[tabId];
    }

    var onTabCreated = function(tab) {
        addTab(tab.id, tab)
    }

    var onActivated = function(eventInfo) {
        tabs['currentTab'] = eventInfo.tabId;
    }

    chrome.extension.onMessage.addListener( function(req, sender, cb) {
        if(req.whitelist){
            addToTabWhitelist(req.whitelist)
        }
    });

    chrome.tabs.onUpdated.addListener( function(tabId, eventInfo, tabData) {
        onTabUpdated(tabId, eventInfo, tabData);
    });

    chrome.tabs.onActivated.addListener( function(eventInfo){
        onActivated(eventInfo);
    });

    chrome.tabs.onCreated.addListener( function(tab) {
        onTabCreated(tab);
    });

    chrome.tabs.onRemoved.addListener( function(tabId) {
        onTabRemoved(tabId);
    });

    var exports = {
        getCurrentTab: getCurrentTab,
        getTab: getTab,
        updateTab: updateTab,
        reloadTab: reloadTab,
        addToTabWhitelist: addToTabWhitelist
    };

    return exports;
})();
