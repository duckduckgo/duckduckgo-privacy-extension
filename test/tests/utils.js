(function() {
  QUnit.module("utils");
  QUnit.test("Utils", function (assert) {

  var tests = [
    { 'url': 'https://duckduckgo.com', 'expected': 'duckduckgo.com'},
    { 'url': 'https://duckduckgo.com/?q=something', 'expected': 'duckduckgo.com'}
  ];

  tests.forEach(function(test) {
          var host = bkg.utils.extractHostFromURL(test.url);
          assert.ok(host === test.expected, 'extracted correct host from url');
  });
  });
})();
