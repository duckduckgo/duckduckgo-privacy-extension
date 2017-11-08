global.companyList = function(listData){
    /* format Mozilla block list for our use
     * https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-blacklist.json
     * "<tracker host>" : { "c": <company name>, "u": "company url" }
     */
    var companyListLoc = 'https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-blacklist.json'
    var remapDataLoc = 'https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/google_mapping.json'
    var trackerList = { TopTrackerDomains:{} }
    var trackerTypes = ['Advertising', 'Analytics', 'Disconnect', 'Social']
    var request = require('request')
    var remapData
    var companyList

    // FIXME -- use settings data in the future.
    // (but settings data needs to be read in a different way than it currently can.)
    let majorNetworks = {
        'Google': true,
        'Facebook': true,
        'Twitter': true,
        'Amazon': true,
        'AppNexus': true
    }

    return new Promise ((resolve) => {

        request.get(remapDataLoc, (err, res, body) => {
            remapData = JSON.parse(body).categories;

            request.get(companyListLoc, (err, res, body) => {
                companyList = JSON.parse(body);

                trackerTypes.forEach((type) => {
                    companyList.categories[type].forEach((entry) => {

                        for (var name in entry) {
                            let normalizedName = name
                            if (name === 'Amazon.com') normalizedName = 'Amazon'

                            // ItIsAtracker is not a real entry in the list
                            if (name !== 'ItIsATracker') {
                                for (var domain in entry[name]){
                                    if (entry[name][domain].length) {
                                        entry[name][domain].forEach((trackerURL) => {
                                            addToList(type, trackerURL, {'c': normalizedName, 'u': domain});
                                        });
                                    }
                                }
                            }
                        }
                    });
                });

                resolve({'name': 'trackersWithParentCompany', 'data': trackerList})
            })
        })
    })

    function addToList(type, url, data) {
        type = applyRemapping(type, data.c, url);
        trackerList[type] = trackerList[type] ? trackerList[type] : {};
        trackerList[type][url] = data;

        // if this is a major network, add to domain mapping
        if (majorNetworks[data.c]) {
            trackerList.TopTrackerDomains[url] = {'c': data.c, 't': type};
        }
    }

    function applyRemapping(type, name, url) {
        if (type === 'Disconnect'){
            var socialRemap = remapSocial(type, name, url);
            if(socialRemap){
                return socialRemap;
            }

            var googleReMap = remapGoogle(type, name, url);
            if (googleReMap) {
                return googleReMap
            }
        }
        return type;
    }

    function remapSocial(type, name, url){
        var newType
        if (name === 'Facebook' || name === 'Twitter') {
            newType = 'Social'
        }
        return newType;
    }

    function remapGoogle(type, name, url){
        var newType;
        if(name === 'Google'){
            Object.keys(remapData).some( function(category) {
                if(remapData[category][0]['Google']['http://www.google.com/'].indexOf(url) !== -1){
                    return newType = category;
                }
            });
        }
        return newType;
    }
};
