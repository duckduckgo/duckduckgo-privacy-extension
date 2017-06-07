abp = require('abp-filter-parser');
var easyList = load.loadExtensionFile('data/tracker_lists/easyprivacy.txt');
parsedEasyList = {};
abp.parse(easyList, parsedEasyList);
