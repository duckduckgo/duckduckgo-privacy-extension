const https = require('../shared/js/background/https.es6');
const staticDomains = require('../static_domains');
const httpsFull = require('../https2');

// create hash so we can check against it
const httpsFullObj = {};
httpsFull.forEach((url) => {
    httpsFullObj[url] = true;
});

let hits = 0;
let bloomHits = 0;
let bloomFalsePositives = 0;

Promise.resolve()
  .then(() => {
    $("body").append("<h1>bloom filter</h1>")
  })
  .then(() => {
      https.ready().then(() => {
          console.time("checking url");
          staticDomains.forEach((url) => {
              recordResult(https.canUpgradeHost(url), url)        
          });
        console.timeEnd("checking url");
        $("body").append(`<h2>bloom upgrades:</h2> ${((bloomHits + bloomFalsePositives) / staticDomains.length) * 100}%`);
        $("body").append(`<h2>JSON upgrades:</h2> ${(hits / staticDomains.length) * 100}%`);
      })
  })

function recordResult(bloomResult, url) {
    if (bloomResult) {
        if (httpsFullObj[url]) {
            bloomHits += 1;
            hits += 1;
        } else {
            bloomFalsePositives += 1;
        }
    } else if (httpsFullObj[url]) {
        hits += 1;
    }
}
