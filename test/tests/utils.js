(function() {
  QUnit.module("utils");
  QUnit.test("Utils", function (assert) {

  var tests = [
    { url: 'https://duckduckgo.com', hostname: 'duckduckgo.com', protocol: 'https:'},
    { url: 'http://duckduckgo.com/?q=something', hostname: 'duckduckgo.com', protocol: 'http:'}
  ];

  tests.forEach(function(test) {
          var host = bkg.utils.extractHostFromURL(test.url);
          var protocol = bkg.utils.getProtocol(test.url)
          assert.ok(host === test.hostname, 'extracted correct host from url');
          assert.ok(protocol === test.protocol, 'extracted correct protocol from url');
  });

  });
})();
