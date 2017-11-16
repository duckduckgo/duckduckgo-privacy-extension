(function() {
  QUnit.module("trackers");
  var fakeRequest = {type: 'script'};
  let fakeTab = {
      tabId: 0,
      url: 'http://test.com',
      site: {domain: 'test.com'}
  }

  var basicBlocking = [
    { url: 'https://doubleclick.net', block: true},
    { url: 'https://duckduckgo.com', block: false},
    { url: 'https://developers.google.com', block: true},
    { url: 'https://x.y.z.doubleclick.net', block: true},
    { url: 'https://logx.optimizely.com/log/event', block: true},
  ];
  
  QUnit.test("block url", function (assert) {
      // turn social blocking on for this test
      bkg.settings.updateSetting('socialBlockingIsEnabled', true);
      
      basicBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', true);
          
          var toBlock = bkg.trackers.isTracker(test.url, fakeTab, fakeRequest);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === test.block, 'url should be blocked');
      });
  });
  
  QUnit.test("turn off blocking", function (assert) {
      basicBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', false);
          var toBlock = bkg.trackers.isTracker(test.url, fakeTab, 0, fakeRequest);
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

          let testTab = {
              tabId: 0,
              url: test.url,
              site: {domain: utils.extractHostFromURL(test.url)}
          }

          var toBlock = bkg.trackers.isTracker(test.potentialTracker, testTab, fakeRequest);
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
          var toBlock = bkg.trackers.isTracker(test.url, fakeTab, fakeRequest);
          toBlock = toBlock ? true : false;
          assert.ok(toBlock === test.block, 'url should be blocked');
      });
  });
  
  QUnit.test("social blocking Off", function (assert) {
      socialBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', true);
          bkg.settings.updateSetting('socialBlockingIsEnabled', false);
          var toBlock = bkg.trackers.isTracker(test.url, fakeTab, fakeRequest);
          toBlock = toBlock ? false : true;
          assert.ok(toBlock === test.block, 'url should be blocked');
      });
  });

  // Some basic tests for the abp module. These should be expanded to cover all abp filter options
  QUnit.test("Test abp matching", (assert) => {
      let testBlockList = [
          {tracker: 'some.tracker.com', block: ['foo.com', 'othersite.net'], dontBlock: []},
          {tracker: 'some.othertracker.com^$domain=othersite.net', block: ['othersite.net'], dontBlock: ['foo.com']},
          {tracker: 'some.othertracker2.com^$domain=~othersite.net', block: ['foo.com'], dontBlock: ['othersite.net']}
      ]
      
      let fakeEasylist = testBlockList.map((e) => {
          return e.tracker
      }).join('\n')

      let parsedList = {}
      abp.parse(fakeEasylist, parsedList)

      testBlockList.forEach((e) => {
          e.block.forEach((url) => {
              let match = abp.matches(parsedList, e.tracker, {
                  domain: url, elementTypeMaskMap:abp.elementTypes['SCRIPT']})
              assert.ok(match, 'Tracker should be blocked')
          })

          e.dontBlock.forEach((url) => {
              let match = abp.matches(parsedList, e.tracker, {
                  domain: url, elementTypeMaskMap:abp.elementTypes['SCRIPT']})
              assert.ok(!match, 'Tracker should not be blocked')
          })
      })
  })

})();
