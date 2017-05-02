var Companies = ( () => {
    var data = {};
    var topBlocked = new TopBlocked(sortFunc);
    var utils = require('utils');
    var storageName = "companyData";

    function sortFunc(a, b){
        return data[b].count - data[a].count;
    }
    

    return {
        get: (name) => { return data[name] },

        add: (name) => {
            if(!data[name]){
                data[name] = new Company(name);
                topBlocked.add(name);
            }
            data[name].incrementCount();
            return data[name];
        },

        all: () => { return Object.keys(data) },

        getTopBlocked: (n) => {
            var topBlockedData = [];
            topBlocked.getTop(n).forEach((name) => {
                let c = Companies.get(name);
                topBlockedData.push({"name": c.name, "count": c.count});
            });
            return topBlockedData;
            
        },

        clearData: () => { 
            data = {};
            topBlocked.clear();
        },

        syncToStorage: () => {
            var toSync = {};
            toSync[storageName] = data;
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
