require.scopes.stats = ( () => {
    var utils = require('utils'),
        statsByParentCompany = {},
        statsBySite = {},
        topBlocked = [];

    function clearStats(){
        statsByParentCompany = {};
        statsBySite = {};
        topBlocked = [];
        syncToStorage();
    }

    function updateStatsFromTabData(tab){
        if(tab && tab.trackers && tab.trackers){
            Object.keys(tab.trackers).forEach(function(parentCompany){
                update(parentCompany, tab.url, tab.trackers[parentCompany]);
            });
        }
        // only sync when tab load completes. Should help avoid chrome.storage rate limts
        syncToStorage();
    }

    function update(parentCompany, currentSite, tracker){
        currentSite = utils.extractHostFromURL(currentSite);
        addToTopBlocked(parentCompany);
        addToParentCompanyStats(parentCompany, tracker);
        addToSiteStats(currentSite, tracker);
    }

    function addToTopBlocked(parent){
        if(!statsByParentCompany[parent]){
            topBlocked.push(parent);
        }
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

    function sortTopBlocked(){
        topBlocked.sort(function(a, b){
            var a = statsByParentCompany[a];
            var b = statsByParentCompany[b];
            return b - a;
        });
    }

    function calcSiteScore(siteData){
        // dummy score for now
        return siteData.trackers.length;
    }

    function getTopBlocked(blocked){
        sortTopBlocked();
        blocked = blocked ? blocked : 10;
        let topBlockedCompanies = []
        topBlocked.slice(0, blocked).forEach(function(name){
            topBlockedCompanies.push({ "name": name, "count": statsByParentCompany[name]});
        });
        return topBlockedCompanies;
    }

    function buildSavedStatsFromStorage(){
        chrome.storage.local.get(['stats'], function(result) {
            if(result['byParent']){
                statsByParentCompany = result['byParent'];
            }
            if(result['topBlocked']){
                topBlocked = result['topBlocked'];
            };

            if(result['bySite']){
                statsBySite = result['bySite'];
            };
        });
    }

    function syncToStorage(){
        chrome.storage.local.set({'stats': { "byParent": statsByParentCompany, "topBlocked": topBlocked, "bySite": statsBySite}});
    }

    function getStatsBySite(){
        return statsBySite;
    }

    buildSavedStatsFromStorage();

    var exports = {
        "update": update,
        "getTopBlocked": getTopBlocked,
        "getStatsBySite": getStatsBySite,
        "updateStatsFromTabData": updateStatsFromTabData,
        "syncToStorage": syncToStorage,
        "clearStats": clearStats
    };
    return exports;
})();
