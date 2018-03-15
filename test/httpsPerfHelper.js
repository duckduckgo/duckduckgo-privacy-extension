const https = require('../shared/js/background/https.es6');

Promise.resolve()
  .then(() => {
    $("body").append("<h1>200k rules</h1>")
  })
  .then(https.loadListViaDexieAsTextBlob.bind(https))
  .then(() => {
    $("body").append("<h1>1m rules</h1>");
    https.multiplier = "1m";
  })
  .then(https.loadListViaDexieAsTextBlob.bind(https))
  .then(() => {
    $("body").append("<h1>10m rules</h1>");
    https.multiplier = "10m";
  })
  .then(https.loadListViaDexieAsTextBlob.bind(https))
  .then(() => {
    $("body").append("<h1>20m rules</h1>");
    https.multiplier = "20m";
  })
  .then(https.loadListViaDexieAsTextBlob.bind(https));
