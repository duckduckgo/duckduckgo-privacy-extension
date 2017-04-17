require.scopes.importers.disconnect = function(listData){
    /* format Mozilla block list for our use
     * https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-blacklist.json
     * "<tracker host>" : { "c": <company name>, "u": "company url" }
     */
    var trackers = require('trackers'),
    utils = require('utils'),
    disconnectList = load.JSONfromExternalFile(listData.loc);
    
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

    trackers.trackersWithParentCompany = trackerList;

    function addToList(type, url, data) {
        trackerList[type] = trackerList[type] ? trackerList[type] : {};
        trackerList[type][url] = data;
    }
};
