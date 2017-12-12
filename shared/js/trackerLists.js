require.scopes.trackerLists = (function() {
    var settings = require('settings')
    var load = require('load')
    var lists = {}

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

    return {
        getLists: getLists
    }

})()
