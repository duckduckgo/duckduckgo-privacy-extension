require.scopes.trackerLists = ( function() {
    var settings = require('settings');
    var load = require('load');
    var lists = {};
    var listLocation = settings.getSetting('trackerListLoc');

    function getLists() {
        return lists;
    }

    function setList(name, data) {
        lists[name] = data;
    }

    function loadLists(){
        var blockLists = settings.getSetting('blockLists');
        blockLists.forEach( function(listName) {
            load.JSONfromLocalFile(listLocation + "/" + listName, (listJSON) => {
                lists[listName] = listJSON
            });
        });
    }

    loadLists();

    var exports = {
        getLists: getLists,
    }
    return exports;
})();
