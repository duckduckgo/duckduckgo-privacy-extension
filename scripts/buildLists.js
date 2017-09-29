var glob = require('glob'), 
    path = require('path'),
    fs = require('fs');

glob.sync( './scripts/importers/*.js' ).forEach( function(file) {
    require(path.resolve(file));
});

var trackerListData = require('./tracker_list_data.json');

trackerListData.forEach( function(listData) {
    global[listData.type](listData).then( (processedList) => {
        if(processedList){
            fs.writeFile(__dirname + "/tracker_lists/" + processedList.name, JSON.stringify(processedList.data, null, 4), function(err) {
                if(err) {
                        return console.log(err);
                }
            });
        }
    });
});
