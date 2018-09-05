const load = require('./load.es6')
const constants = require('../../data/constants')
let lists = {}

function getLists () {
    return lists
}

function loadLists () {
    var listLocation = constants.trackerListLoc
    var blockLists = constants.blockLists

    blockLists.forEach(function (listName) {
        load.JSONfromLocalFile(listLocation + '/' + listName).then((response) => {
            let listJSON = response.data

            Object.keys(listJSON).forEach(categoryName => {
                let category = listJSON[categoryName]

                Object.keys(category).forEach(trackerName => {
                    let tracker = category[trackerName]

                    // Look for regex rules and pre-compile to speed up the blocking algo later on
                    if (tracker.rules) {
                        for (let i in tracker.rules) {
                            // All of our rules are host anchored and have an implied wildcard at the end.
                            tracker.rules[i].rule = new RegExp(tracker.rules[i].rule + '.*', 'i')
                        }
                    }
                })
            })
            console.log(`Loaded tracker list: ${listLocation}/${listName}`)
            lists[listName.replace('.json', '')] = listJSON
        })
    })
}

loadLists()

module.exports = {
    getLists: getLists
}
