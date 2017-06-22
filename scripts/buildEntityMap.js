const fs = require('fs')
fs.readFile('data/tracker_lists/disconnect-entitylist.json', 'utf8', function (err,data) {
      if (err) {
          return console.log(err);
      }

      let json = JSON.parse(data);
      let out = {};

      for(let parent in json) {
          json[parent].properties.map(url => {
              out[url] = parent;
          });
      }

      fs.writeFile('data/tracker_lists/entityMap.json', JSON.stringify(out), (err) => { if(err) console.log(err)} );
});
