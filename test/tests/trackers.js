(function() {
  QUnit.module("trackers");

  var trackers = require('trackers');
  var settings = require('settings');
  var fakeRequest = {type: 'script'};

  var basicBlocking = [
    { 'url': 'https://doubleclick.net', 'block': true},
    { 'url': 'https://duckduckgo.com', 'block': false},
    { 'url': 'https://logx.optimizely.com/log/event', 'block': true}
  ];

  basicBlocking.forEach(function(test) {
      QUnit.test("block url", function (assert) {
          settings.updateSetting('trackerBlockingEnabled', true);
          var toBlock = trackers.isTracker(test.url, '', 0, fakeRequest);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === test.block, 'url should be blocked');
      });
  });

  basicBlocking.forEach(function(test) {
      QUnit.test("turn off blocking", function (assert) {
          settings.updateSetting('trackerBlockingEnabled', false);
          var toBlock = trackers.isTracker(test.url, '', 0, fakeRequest);
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
          settings.updateSetting('trackerBlockingEnabled', true);
          settings.updateSetting('socialBlockingIsEnabled', true);
          var toBlock = trackers.isTracker(test.url, test.host, 0, fakeRequest);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === test.block, test.message);
      });
  });

  var socialBlocking = [
    { 'url': 'https://facebook.com/?q=something&param=a', 'block': true},
    { 'url': 'http://twitter.com/somescript.js', 'block': true}
  ];

  socialBlocking.forEach(function(test) {
      QUnit.test("social blocking On", function (assert) {
          settings.updateSetting('trackerBlockingEnabled', true);
          settings.updateSetting('socialBlockingIsEnabled', true);
          var toBlock = trackers.isTracker(test.url, '', 0, fakeRequest);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === test.block, 'url should be blocked');
      });
  });

  socialBlocking.forEach(function(test) {
      QUnit.test("social blocking Off", function (assert) {
          settings.updateSetting('trackerBlockingEnabled', true);
          settings.updateSetting('socialBlockingIsEnabled', false);
          var toBlock = trackers.isTracker(test.url, '', 0, fakeRequest);
          toBlock = toBlock ? false : true;
          assert.ok(toBlock === test.block, 'url should be blocked');
      });
  });

})();
