var Companies = ( () => {
    var companyContainer = {};
    var topBlocked = new TopBlocked();
    var utils = require('utils');
    var storageName = 'companyData';
    var totalPages = 0; // used for percent calculation

    function sortByCount(a, b){
        return companyContainer[b].count - companyContainer[a].count;
    }
    
    function sortByPages(a, b){
        return companyContainer[b].pagesSeenOn - companyContainer[a].pagesSeenOn;
    }

    return {
        get: (name) => { return companyContainer[name] },

        getTotalPages: () => { return totalPages },

        add: (name) => {
            if(!companyContainer[name]){
                companyContainer[name] = new Company(name);
                topBlocked.add(name);
            }
            companyContainer[name].incrementCount();
            return companyContainer[name];
        },

        // This is used by tab.js to count only unique tracking networks on a tab
        countCompanyOnPage: (name) => {
            if(!companyContainer[name]){
                companyContainer[name] = new Company(name);
                topBlocked.add(name);
            }
            if (name !== 'unknown') companyContainer[name].incrementPagesSeenOn();
        },

        all: () => { return Object.keys(companyContainer) },

        getTopBlocked: (n) => {
            var topBlockedData = [];
            topBlocked.getTop(n, sortByCount).forEach((name) => {
                let c = Companies.get(name);
                topBlockedData.push({name: c.name, count: c.count});
            });
            return topBlockedData;
            
        },

        getTopBlockedByPages: (n) => {
            var topBlockedData = [];
            topBlocked.getTop(n, sortByPages).forEach((name) => {
                let c = Companies.get(name);
                topBlockedData.push({name: c.name, count: Math.round((c.pagesSeenOn/totalPages)*100)});
            });
            return topBlockedData;
        },

        clearData: () => { 
            companyContainer = {};
            totalPages = 0
            topBlocked.clear();
        },

        setPages: (n) => {
            if (n) totalPages = n;
        },

        incrementPages: () => {
            totalPages += 1
        },

        syncToStorage: () => {
            var toSync = {};
            toSync[storageName] = companyContainer;
            utils.syncToStorage(toSync);
            utils.syncToStorage({'totalPages': totalPages})
        },

        buildFromStorage: () => {
             utils.getFromStorage(storageName, function(storageData){
                 for(company in storageData){
                     let newCompany = Companies.add(company);
                     newCompany.set('count',storageData[company].count || 0);
                     newCompany.set('pagesSeenOn',storageData[company].pagesSeenOn || 0);
                 }
             });

             utils.getFromStorage('totalPages', n => Companies.setPages(n))
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

chrome.runtime.onMessage.addListener((req, sender, res) => {
    if (req.getTopBlocked) {
        res(Companies.getTopBlocked(req.getTopBlocked))
    }
    else if (req.getTopBlockedByPages) {
        res(Companies.getTopBlockedByPages(req.getTopBlockedByPages))
    }
    return true;
});
