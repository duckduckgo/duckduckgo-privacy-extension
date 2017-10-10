require.scopes.trackerLists = ( function() {
    var settings = require('settings');
    var load = require('load');
    var lists = {};

    function getLists() {
        return lists;
    }

    function setList(name, data) {
        lists[name] = data;
    }

    function loadLists(){
        var listLocation = settings.getSetting('trackerListLoc')
        var blockLists = settings.getSetting('blockLists');
        blockLists.forEach( function(listName) {
            load.JSONfromLocalFile(listLocation + "/" + listName, (listJSON) => {
                lists[listName] = listJSON
            });
        });
    }

    settings.ready().then(() => loadLists())

    var exports = {
        getLists: getLists,
    }
    return exports;
})();
