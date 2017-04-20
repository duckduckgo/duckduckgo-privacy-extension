var glob = require('glob'), 
    path = require('path'),
    fs = require('fs');

glob.sync( './scripts/importers/*.js' ).forEach( function(file) {
    require(path.resolve(file));
});

global.settings = require('../data/default_settings.json');

settings.blockLists.forEach( function(listData) {
    var processedList = global[listData.type](listData);
    if(processedList){
        fs.writeFile(__dirname + "/tracker_lists/" + processedList.name, JSON.stringify(processedList.data, null, 4), function(err) {
            if(err) {
                    return console.log(err);
             }
         });
    }
});
