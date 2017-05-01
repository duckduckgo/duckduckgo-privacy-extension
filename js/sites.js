var Sites = ( () => {
    var data = {};
    var storageName = "siteData";
    var utils = require('utils');

    return {
        get: (domain) => { return data[domain] },

        currentSiteScore: (domain) => {
            if(domain){
                return data[domain].score;
            }
            else {
                utils.getCurrentURL(function(url){
                    let host = utils.extractHostFromURL(url);
                    let site =  data[host];
                    return site.score;
                });
            }
        },
            
        add: (domain) => {
            if(!data[domain]){
                data[domain] = new Site(domain);
            }
            return data[domain];
        },

        all: () => { return Object.keys(data) },

        clearData: () => { data = {} },

        syncToStorage: () => { 
            var toSync = {};
            toSync[storageName] = data;
            utils.syncToStorage(toSync);
        },

        buildFromStorage: () => {
            utils.getFromStorage(storageName, function(storageData){
                for(site in storageData){
                    let newSite = Sites.add(site);
                    let siteData = storageData[site];
                    newSite.setTrackers(siteData.trackers);
                    newSite.setScore(siteData.score);
                    newSite.setWhiteList(siteData.whiteListed);
                }
            });
        }
    };
})();

Sites.buildFromStorage();
