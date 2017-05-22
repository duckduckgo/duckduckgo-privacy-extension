var Companies = ( () => {
    var companyContainer = {};
    var topBlocked = new TopBlocked(sortFunc);
    var utils = require('utils');
    var storageName = "companyData";

    function sortFunc(a, b){
        return companyContainer[b].count - companyContainer[a].count;
    }
    

    return {
        get: (name) => { return companyContainer[name] },

        add: (name) => {
            if(!companyContainer[name]){
                companyContainer[name] = new Company(name);
                topBlocked.add(name);
            }
            companyContainer[name].incrementCount();
            return companyContainer[name];
        },

        all: () => { return Object.keys(companyContainer) },

        getTopBlocked: (n) => {
            var topBlockedData = [];
            topBlocked.getTop(n).forEach((name) => {
                let c = Companies.get(name);
                topBlockedData.push({"name": c.name, "count": c.count});
            });
            return topBlockedData;
            
        },

        clearData: () => { 
            companyContainer = {};
            topBlocked.clear();
        },

        syncToStorage: () => {
            var toSync = {};
            toSync[storageName] = companyContainer;
            utils.syncToStorage(toSync);
        },

        buildFromStorage: () => {
             utils.getFromStorage(storageName, function(storageData){
                 for(company in storageData){
                     let newCompany = Companies.add(company);
                     newCompany.setCount(storageData[company].count);
                 }
             });
         }
     };
})();

Companies.buildFromStorage();

// sync data to storage when a tab finishes loading
chrome.tabs.onUpdated.addListener( (id,info) => {
    if (info.status === "complete") {
        Companies.syncToStorage();
    }
});
