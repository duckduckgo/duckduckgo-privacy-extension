(function() {
  QUnit.module("trackers");
  var fakeRequest = {type: 'script'};

  var basicBlocking = [
    { url: 'https://doubleclick.net', block: true},
    { url: 'https://duckduckgo.com', block: false},
    { url: 'https://developers.google.com', block: true},
    { url: 'https://x.y.z.doubleclick.net', block: true},
    { url: 'https://logx.optimizely.com/log/event', block: true}
  ];
  
  QUnit.test("block url", function (assert) {
      // turn social blocking on for this test
      bkg.settings.updateSetting('socialBlockingIsEnabled', true);
      
      basicBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', true);
          var toBlock = bkg.trackers.isTracker(test.url, 'http://test.com', 0, fakeRequest);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === test.block, 'url should be blocked');
      });
  });
  
  QUnit.test("turn off blocking", function (assert) {
      basicBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', false);
          var toBlock = bkg.trackers.isTracker(test.url, '', 0, fakeRequest);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === false, 'url should not be');
      });
  });

  var thirdPartyTests = [
      { url: 'https://facebook.com', potentialTracker: 'https://facebook.com', block: false, message: 'don\'t block first party requests'},
      { url: 'https://independent.co.uk', potentialTracker: 'https://amazon.co.uk', block: true, message: 'handle two part tld'},
      { url: 'https://independent.co.uk', potentialTracker: 'https://subdomain.amazon.co.uk', block: true, message: 'handle two part tld'},
      { url: 'https://amazon.co.uk', potentialTracker: 'https://subdomain.amazon.co.uk', block: false, message: 'handle two part tld'},
      { url: 'https://facebook.com', potentialTracker: 'https://reddit.com', block: true, message: 'should block third party request'},
      { url: 'https://facebook.com', potentialTracker: 'https://instagram.com', block: false, message: 'should not block third party requests owned by same parent company'}
  ];
  
  QUnit.test("third party blocking", function (assert) {
      thirdPartyTests.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', true);
          bkg.settings.updateSetting('socialBlockingIsEnabled', true);
          var toBlock = bkg.trackers.isTracker(test.potentialTracker, test.url, 0, fakeRequest);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === test.block, test.message);
      });
  });

  var socialBlocking = [
    { url: 'https://facebook.com/?q=something&param=a', block: true},
    { url: 'http://twitter.com/somescript.js', block: true}
  ];
  
  QUnit.test("social blocking On", function (assert) {
      socialBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', true);
          bkg.settings.updateSetting('socialBlockingIsEnabled', true);
          var toBlock = bkg.trackers.isTracker(test.url, 'http://test.com', 0, fakeRequest);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === test.block, 'url should be blocked');
      });
  });
  
  QUnit.test("social blocking Off", function (assert) {
      socialBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', true);
          bkg.settings.updateSetting('socialBlockingIsEnabled', false);
          var toBlock = bkg.trackers.isTracker(test.url, 'http://test.com', 0, fakeRequest);
          toBlock = toBlock ? false : true;
          assert.ok(toBlock === test.block, 'url should be blocked');
      });
  });

})();
