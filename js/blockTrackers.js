require.scopes.blockTrackers = (function() {
    
    // If blocking option is enabled
    // and url matches a tracker pattern
    // block the request
    function blockTrackers(tabId, url) {
        if (localStorage['blocking'] === 'true') {
            for (var i = 0; i < $this.trackers.trackers.length; i++) {
                if (url.indexOf($this.trackers.trackers[i]) !== -1) {
                    localStorage['debug_blocking'] = (localStorage['blocking'] === 'true')? 'true' : 'false'; 
                    localStorage[tabId] = localStorage[tabId]? parseInt(localStorage[tabId]) + 1 : 1;
                    chrome.browserAction.setBadgeText({tabId: parseInt(tabId) + 0, text: localStorage[tabId] + ""});
                    
                    return {cancel: true};
                }
            }
        }
        else if (localStorage['blocking'] === 'false') {
            //$this.tabTrackers = {};
            chrome.browserAction.setBadgeText({tabId: parseInt(tabId) + 0, text: ""});
        }
    }

    // Import JSON list of trackers to block
    function getJSON() {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', 'js/trackers.json', true); 
        xobj.responseType = 'text';


        xobj.onload = function () {
            if (xobj.readyState === xobj.DONE) {
                if (xobj.status === 200) {
                    localStorage['response'] = xobj.responseText;    
                }
            }
        };

        xobj.send(null);
    }
    
    
    
    var exports = {};
    exports.blockTrackers = blockTrackers;
    exports.getJSON = getJSON;

    return exports;
})();
