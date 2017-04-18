(function() {
  QUnit.module("trackers");

  var trackers = require('trackers');
  var settings = require('settings');

  var tests = [
    { 'url': 'https://doubleclick.net', 'block': true},
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

})();
