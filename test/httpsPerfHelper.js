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
  .then(https.loadAndParseBloomFilter.bind(https))
  .then(() => {
      console.time("checking url");
      staticDomains.forEach((url) => {
          let bloomResult = https.canUpgradeHost(url)

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
      });
      console.timeEnd("checking url");

      console.log(`bloom upgrades: ${((bloomHits + bloomFalsePositives) / staticDomains.length) * 100}%`);
      console.log(`JSON upgrades: ${(hits / staticDomains.length) * 100}%`);
  })
