const https = require('../shared/js/https');

Promise.resolve()
  .then(https.loadListViaDexieAsTextBlob.bind(https))
  .then(https.loadListViaLocalStorage.bind(https))
  .then(https.loadListViaDexieAsObjectBlob.bind(https));
