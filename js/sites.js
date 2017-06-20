var Sites = ( () => {
    var siteContainer = {};
    var storageName = "siteData";
    var utils = require('utils');
    var scoreFunction = function(){
        return this.trackers.length;
    };

    return {
        get: (domain) => { 
            let site = siteContainer[domain] || Sites.add(domain);
            return site;
        },
            
        add: (domain) => {
            if(!siteContainer[domain]){
                siteContainer[domain] = new Site(domain, scoreFunction);
            }
            return siteContainer[domain];
        },

        delete: (siteObj) => {
            delete siteContainer[siteObj.domain];
        },

        all: () => { return Object.keys(siteContainer) },

        clearData: () => { siteContainer = {} }

    };
})();
