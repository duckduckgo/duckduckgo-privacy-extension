const https = require('../shared/js/https');

Promise.resolve()
  .then(() => {
    $("body").append("<h1>200k rules</h1>")
  })
  .then(https.loadListViaDexieAsTextBlob.bind(https))
  .then(https.loadListViaLocalStorage.bind(https))
  .then(https.loadListViaDexieAsObjectBlob.bind(https))
  .then(() => {
    $("body").append("<h1>1m rules</h1>");
    https.million = true;
  })
  .then(https.loadListViaDexieAsTextBlob.bind(https))
  .then(https.loadListViaLocalStorage.bind(https))
  .then(https.loadListViaDexieAsObjectBlob.bind(https));
