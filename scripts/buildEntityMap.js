var request = require('request'),
    fs = require('fs');

let requestData = {
    method: 'get',
    uri: 'https://duckduckgo.com/contentblocking.js?l=entitylist2',
    gzip: true
}

request(requestData, (err, res, body) => {
    if (err) {
        return console.log(err);
    }
    
    let json = JSON.parse(body);
    let out = {};

    for(let parent in json) {
        json[parent].properties.map(url => {
            out[url] = parent;
        });
        json[parent].resources.map(url => {
            out[url] = parent;
        });
    }

    fs.writeFile('shared/data/tracker_lists/entityMap.json', JSON.stringify(out), (err) => { if(err) console.log(err)} );
});
