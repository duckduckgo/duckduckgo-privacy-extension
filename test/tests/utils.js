(function() {
  QUnit.module("utils");

  var utils = require('utils');
  var tests = [
    { 'url': 'https://duckduckgo.com', 'expected': 'duckduckgo.com'},
    { 'url': 'https://duckduckgo.com/?q=something', 'expected': 'duckduckgo.com'}
  ];

  tests.forEach(function(test) {
      QUnit.test("get hostname from url", function (assert) {
          var host = utils.extractHostFromURL(test.url);
          assert.ok(host === test.expected, 'extracted correct host from url');
      });
  });
})();
