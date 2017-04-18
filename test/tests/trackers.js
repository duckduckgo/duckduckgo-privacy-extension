(function() {
  QUnit.module("trackers");

  var trackers = require('trackers');
  var settings = require('settings');

  var tests = [
    { 'url': 'https://doubleclick.net', 'block': true},
    { 'url': 'https://facebook.com/?q=something&param=a', 'block': true},
    { 'url': 'https://duckduckgo.com', 'block': false}
  ];

  tests.forEach(function(test) {
      QUnit.test("block url", function (assert) {
          settings.updateSetting('extensionIsEnabled', true);
          var toBlock = trackers.blockTrackers(test.url, '', 0);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === test.block, 'url should be blocked');
      });
  });

  tests.forEach(function(test) {
      QUnit.test("turn off blocking", function (assert) {
          settings.updateSetting('extensionIsEnabled', false);
          var toBlock = trackers.blockTrackers(test.url, '', 0);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === false, 'url should not be');
      });
  });

  var thirdPartyTests = [
      { 'url': 'https://facebook.com', 'host': 'https://facebook.com', 'block': false, 'message': 'don\'t block first party requests'},
      { 'url': 'https://facebook.com', 'host': 'https://reddit.com', 'block': true, 'message': 'should block third party request'},
      { 'url': 'https://facebook.com', 'host': 'https://instagram.com', 'block': false, 'message': 'should not block third party requests owned by same parent company'}
  ];

  thirdPartyTests.forEach(function(test) {
      QUnit.test("third party blocking", function (assert) {
          settings.updateSetting('extensionIsEnabled', true);
          var toBlock = trackers.blockTrackers(test.url, test.host, 0);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === test.block, test.message);
      });
  });

})();
