abp = require('abp-filter-parser');
let request = require('request');

request('https://easylist.to/easylist/easyprivacy.txt', ((err, res, body) => {
    parsedEasyList = {};
    abp.parse(body, parsedEasyList);
}));

