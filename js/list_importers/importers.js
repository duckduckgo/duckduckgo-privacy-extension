var settings = require('settings');

require.scopes.importers = (function() {

    function init(){
        buildListsFromSettings();
    }

    function dispatchImporter(listData) {
        require.scopes.importers[listData.type](listData);
    }

    function buildListsFromSettings() {
        var lists = settings.getSetting('blockLists');
        lists.forEach( function(listData) {
            dispatchImporter(listData);
        });
    }

    var exports = { 
        init: init
    };
    return exports;
})();

