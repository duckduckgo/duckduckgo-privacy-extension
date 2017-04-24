require.scopes.stats = ( () => {
    var utils = require('utils'),
        statsByParentCompany = {},
        statsBySite = {},
        topBlocked = [];

    function update(parentCompany, currentSite, tracker){
        currentSite = utils.extractHostFromURL(currentSite);
        addToParentCompanyStats(parentCompany, currentSite, tracker);
        addToSiteStats(currentSite, tracker)
        syncToStorage();
    }

    function addToParentCompanyStats(){
        // add to byParent data struct
        // recalc topBlocked
    }

    function addToSiteStats(site, tracker){
        var siteData = statsBySite[site] ? statsBySite[site] : {"score": null, "trackers": []};
        
        if(siteData.trackers.indexOf(tracker) === -1){
            siteData.trackers.push(tracker);
        }
        siteData.score = calcSiteScore(siteData);
        statsBySite[site] = siteData;
    }

    function calcSiteScore(siteData){
        // dummy score for now
        return siteData.trackers.length;
    }

    function getTopBlocked(blocked){
        blocked = blocked ? blocked : 10;
        return topBlocked.slice(9);
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
        "getStatsBySite": getStatsBySite
    };
    return exports;
})();
