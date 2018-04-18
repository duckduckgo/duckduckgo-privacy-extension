/**
 * format Mozilla block list for our use
 * https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-blacklist.json
 * "<tracker host>" : { "c": <company name>, "u": "company url" }
 */
const request = require('request')
const fs = require('fs')
const majorNetworks = require('../data/major-tracking-networks')

let trackerList = { TopTrackerDomains: {} }
let trackerTypes = ['Advertising', 'Analytics', 'Social']

function addToList (type, url, data) {
    trackerList[type] = trackerList[type] ? trackerList[type] : {};
    trackerList[type][url] = data;

    // if this is a major network, add to domain mapping
    if (majorNetworks[data.c.toLowerCase()]) {
        trackerList.TopTrackerDomains[url] = {'c': data.c, 't': type};
    }
}

request({
        method: 'get',
        uri: 'https://duckduckgo.com/contentblocking.js?l=disconnect',
        gzip: true
    }, (err, res, body) => {
        if (err) { return console.log(err) }

        let companyList = JSON.parse(body)

        trackerTypes.forEach((type) => {
            companyList.categories[type].forEach((entry) => {
                for (let name in entry) {
                    // ItIsAtracker is not a real entry in the list
                    if (name === 'ItIsATracker') { continue }

                    for (let domain in entry[name]) {
                        entry[name][domain].forEach((trackerURL) => {
                            addToList(type, trackerURL, {'c': name, 'u': domain});
                        })
                    }
                }
            })
        })

        fs.writeFileSync('data/generated/trackers-with-parent-company.json', JSON.stringify(trackerList))
    })
