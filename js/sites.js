var Sites = ( () => {
    var siteContainer = {};
    var storageName = "siteData";
    var utils = require('utils');
    var scoreFunction = function(){
        return this.trackers.length;
    };

    return {
        get: (domain) => { return siteContainer[domain] },
            
        add: (domain) => {
            if(!siteContainer[domain]){
                siteContainer[domain] = new Site(domain, scoreFunction);
            }
            return siteContainer[domain];
        },

        all: () => { return Object.keys(siteContainer) },

        clearData: () => { siteContainer = {} }

    };
})();
