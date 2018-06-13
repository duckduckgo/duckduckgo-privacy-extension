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
        load.JSONfromLocalFile(listLocation + '/' + listName, (listJSON) => {
            Object.keys(listJSON).forEach(categoryName => {
                let category = listJSON[categoryName]

                Object.keys(category).forEach(trackerName => {
                    let tracker = category[trackerName]

                    if (tracker.rules) {
                        for (let i in tracker.rules) {
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
