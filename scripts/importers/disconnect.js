global.disconnect = function(listData){
    /* format Mozilla block list for our use
     * https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-blacklist.json
     * "<tracker host>" : { "c": <company name>, "u": "company url" }
     */
    var disconnectList = require("./../tracker_lists/" + listData.loc);
    var googleRemapData = require("./../tracker_lists/" + listData.gmapping).categories;
    var trackerList = {};
    var trackerTypes = ['Advertising', 'Analytics', 'Disconnect', 'Social'];

    trackerTypes.forEach((type) => {
        disconnectList.categories[type].forEach((entry) => {
            for(var name in entry){
                for( var domain in entry[name]){
                    entry[name][domain].forEach((trackerURL) => {
                        addToList(type, trackerURL, {'c': name, 'u': domain});
                    });
                }
            }
        });
    });

    return {"name": 'trackersWithParentCompany', "data": trackerList};

    function addToList(type, url, data) {
        type = applyRemapping(type, data.c, url);
        trackerList[type] = trackerList[type] ? trackerList[type] : {};
        trackerList[type][url] = data;
    }

    function applyRemapping(type, name, url) {
        if(type === 'Disconnect'){
            var socialRemap = remapSocial(type,name,url);
            if(socialRemap){
                return socialRemap;
            }
            
            var googleReMap = remapGoogle(type,name,url);
            if(googleReMap){
                return googleReMap;
            }
        }
        return type;
    }

    function remapSocial(type, name, url){
        var newType;
        if(name === 'Facebook' || name === 'Twitter'){
            newType = "Social";
        }
        return newType;
    }

    function remapGoogle(type, name, url){
        var newType;
        if(name === "Google"){
            Object.keys(googleRemapData).some( function(category) {
                if(googleRemapData[category][0]['Google']['http://www.google.com/'].indexOf(url) !== -1){
                    return newType = category;
                }
            });
        }
        return newType;
    }
};
