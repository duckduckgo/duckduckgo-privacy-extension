var request = require('request'),
    fs = require('fs');

request('https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-entitylist.json', function (err, res, body) {

      if (err) {
          return console.log(err);
      }

      let json = JSON.parse(body);
      let out = {};

      for(let parent in json) {
          json[parent].properties.map(url => {
              out[url] = parent;
          });
      }

      fs.writeFile('data/tracker_lists/entityMap.json', JSON.stringify(out), (err) => { if(err) console.log(err)} );
});
