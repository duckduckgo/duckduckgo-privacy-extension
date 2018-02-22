var settings = require('./settings')
var load = require('./load')
var lists = {}
const constants = require('../data/constants')

function getLists () {
    return lists
}

function setList (name, data) {
    lists[name] = data
}

function loadLists(){
    var listLocation = constants.trackerListLoc
    var blockLists = constants.blockLists
    blockLists.forEach( function(listName) {
        load.JSONfromLocalFile(listLocation + "/" + listName, (listJSON) => {
            console.log(`Loaded tracker list: ${listLocation}/${listName}`)
            lists[listName.replace('.json', '')] = listJSON
        })
    })
}

settings.ready().then(() => loadLists())

module.exports = {
    getLists: getLists
}
