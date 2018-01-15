var request = require('request')
/* format Mozilla block list for our use
 * https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-blacklist.json
 * "<tracker host>" : { "c": <company name>, "u": "company url" }
 */
var remapDataLoc = 'https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/google_mapping.json'
var companyListLoc = 'https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-blacklist.json'
const constants = require('./../../shared/data/constants.js')
const majorNetworks = constants.majorTrackingNetworks
var trackerList = { TopTrackerDomains: {} }
var trackerTypes = ['Advertising', 'Analytics', 'Disconnect', 'Social']
var remapData
var companyList

global.companyList = function (listData) {
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

                resolve({'name': 'trackersWithParentCompany.json', 'data': trackerList})
            })
        })
    })

    function addToList (type, url, data) {
        type = applyRemapping(type, data.c, url);
        trackerList[type] = trackerList[type] ? trackerList[type] : {};
        trackerList[type][url] = data;

        // if this is a major network, add to domain mapping
        if (majorNetworks[data.c.toLowerCase()]) {
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
            newType = 'Analytics' // default to Analytics
            Object.keys(remapData).some( function(category) {
                if(remapData[category][0]['Google']['http://www.google.com/'].indexOf(url) !== -1){
                    return newType = category;
                }
            });
        }
        return newType;
    }
}
