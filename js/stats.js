require.scopes.stats = ( () => {
    var utils = require('utils'),
        statsByParentCompany = {},
        statsBySite = {},
        topBlocked = [];

    function updateStatsFromTabData(tab){
        if(tab && tab.trackers && tab.trackers){
            Object.keys(tab.trackers).forEach(function(parentCompany){
                update(parentCompany, tab.url, tab.trackers[parentCompany]);
            });
        }
    }

    function update(parentCompany, currentSite, tracker){
        currentSite = utils.extractHostFromURL(currentSite);
        addToParentCompanyStats(parentCompany, tracker);
        addToSiteStats(currentSite, tracker);
        calcTopBlocked(parentCompany);
        syncToStorage();
    }

    function addToParentCompanyStats(parentCompany, tracker){
        if(statsByParentCompany[parentCompany]){
            statsByParentCompany[parentCompany] += tracker.count;
        }
        else{
            statsByParentCompany[parentCompany] = tracker.count;
        }
    }

    function addToSiteStats(site, tracker){
        var siteData = statsBySite[site] ? statsBySite[site] : {"score": null, "trackers": []};
        
        if(siteData.trackers.indexOf(tracker.url) === -1){
            siteData.trackers.push(tracker.url);
        }
        siteData.score = calcSiteScore(siteData);
        statsBySite[site] = siteData;
    }

    function calcTopBlocked(parentCompany){
        var currIndex = topBlocked.indexOf(parentCompany);
        if(currIndex !== -1){
            topBlocked.splice(currIndex, 1);
        }

        if(topBlocked.length === 0){
            topBlocked.push(parentCompany);
            return;
        }

        for(var i = 0; i < topBlocked.length; i++){
            var topBlockedEntry = topBlocked[i];
            if(statsByParentCompany[parentCompany] >= statsByParentCompany[topBlockedEntry]){
                topBlocked.splice(i, 0, parentCompany);
                return;
            }
        }

        topBlocked.push(parentCompany);
    }

    function calcSiteScore(siteData){
        // dummy score for now
        return siteData.trackers.length;
    }

    function getTopBlocked(blocked){
        blocked = blocked ? blocked : 10;
        let topBlockedCompanies = []
        topBlocked.slice(0, blocked).forEach(function(name){
            topBlockedCompanies.push({ "name": name, "count": statsByParentCompany[name]});
        });
        return topBlockedCompanies;
    }

    function buildSavedStatsFromStorage(){
        // chrome.runtime.storage
    }

    function syncToStorage(){
       // chrome.runtime.storage
    }

    function getStatsBySite(){
        return statsBySite;
    }

    var exports = {
        "update": update,
        "getTopBlocked": getTopBlocked,
        "getStatsBySite": getStatsBySite,
        "updateStatsFromTabData": updateStatsFromTabData
    };
    return exports;
})();
