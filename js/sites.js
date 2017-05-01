var Sites = ( () => {
    var data = {};
    var storageName = "siteData";
    var utils = require('utils');
    var scoreFunction = function(){
        return this.trackers.length;
    };

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
                data[domain] = new Site(domain, scoreFunction);
            }
            return data[domain];
        },

        all: () => { return Object.keys(data) },

        clearData: () => { data = {} },
    };
})();
