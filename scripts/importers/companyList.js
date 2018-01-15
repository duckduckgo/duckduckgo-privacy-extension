var request = require('request')
/* format Mozilla block list for our use
 * https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-blacklist.json
 * "<tracker host>" : { "c": <company name>, "u": "company url" }
 */
var companyListLoc = 'https://duckduckgo.com/contentblocking.js?l=disconnect'
const constants = require('./../../shared/data/constants.js')
const majorNetworks = constants.majorTrackingNetworks
var trackerList = { TopTrackerDomains: {} }
var trackerTypes = ['Advertising', 'Analytics', 'Social']
var companyList

global.companyList = function (listData) {
    return new Promise ((resolve) => {
        request({
            method: 'GET',
            uri: companyListLoc,
            gzip: true}, (err, res, body) => {
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

    function addToList (type, url, data) {
        trackerList[type] = trackerList[type] ? trackerList[type] : {};
        trackerList[type][url] = data;

        // if this is a major network, add to domain mapping
        if (majorNetworks[data.c.toLowerCase()]) {
            trackerList.TopTrackerDomains[url] = {'c': data.c, 't': type};
        }
    }
}
