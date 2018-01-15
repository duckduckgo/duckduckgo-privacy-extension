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

// For launch, there are some very common trackers that it would be better to show broken out
// by company, but they're not in the Disconnect list, so temporarily adding them here:
const additionalMappings = [
    ['Advertising', { c: 'Twitter', u: 'https://static.ads-twitter.com/'}, 'static.ads-twitter.com' ],
    ['Advertising', { c: 'Twitter', u: 'https://syndication.twitter.com/'}, 'syndication.twitter.com' ],
    ['Advertising', { c: 'Twitter', u: 'https://analytics.twitter.com/'}, 'analytics.twitter.com' ],
    ['Advertising', { c: 'Facebook', u: 'https://connect.facebook.net/'}, 'connect.facebook.net' ],
    ['Advertising', { c: 'Pinterest', u: 'https://ct.pinterest.com/'}, 'ct.pinterest.com' ],
    ['Analytics', { c: 'Optimizely', u: 'https://cdn.optimizely.com/'}, 'cdn.optimizely.com' ]
];

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

                additionalMappings.forEach(function(item) {
                    addToList(item[0], item[2], item[1])
                })

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
            Object.keys(remapData).some( function(category) {
                if(remapData[category][0]['Google']['http://www.google.com/'].indexOf(url) !== -1){
                    return newType = category;
                }
            });
        }
        return newType;
    }
}
