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
    // make sure underscores don't error out
    { url: 'https://foo_bar.duckduckgo.com', block: false},
    { url: 'https://foo_bar.doubleclick.net', block: true},
    // invalid URL
    { url: 'sdfsdfs', block: false}
  ];

  QUnit.test("block url", function (assert) {
      // turn social blocking on for this test
      bkg.settings.updateSetting('socialBlockingIsEnabled', true);
      var done = assert.async()

      setTimeout(function () {
          basicBlocking.forEach(function(test) {
              bkg.settings.updateSetting('trackerBlockingEnabled', true);
              var toBlock = bkg.trackers.isTracker(test.url, fakeTab, fakeRequest);
              toBlock = toBlock ? true : false;
              assert.ok(toBlock === test.block, 'url should be blocked');

              done()
          });
      }, 1000);
  });
 
  // These abp blocking tests are based on actual entries from 
  // the easylist. These tests could fail in the future if the easylist
  // entries are changed or whitelisted.
  var abpBlocking = [
    { url: 'https://s.yimg.com/rq/darla/boot.js', block: false, options:{domain: 'yahoo.com'}, result: {parent: 'Oath', reason: 'first party'}}, // ||yimg.com/rq/darla/$domain=yahoo.com
    { url: 'https://somesite.com/_ad6.', block: true, options:{}, result: {reason: 'general'}}, // _ad6.
    { url: 'https://googleads.g.doubleclick.net/pagead/id', block: true, options:{}, result: {parent: 'Google', reason: 'trackersWithParentCompany'}}, // /googleads.
    { url: 'https://www.redditstatic.com/moat/moatframe.js', block: true, options:{}, result: {parent: 'reddit', reason: 'general'}}, // ||redditstatic.com/moat/
    { url: 'http://ads.rubiconproject.com/header/11078.js', block: true, options:{}, result: {parent: 'Fox One Stop Media', reason: 'trackersWithParentCompany'}}, //  ||rubiconproject.com^$third-party
    { url: 'https://s.yimg.com/rq/darla/3-0-2/js/g-r-min.js', block: false, options: {domain: 'yahoo.com'}}, // @@||yimg.com/rq/darla/*/g-r-min.js$domain=yahoo.com
    { url: 'https://s.yimg.com/zz/combo?yt/y7/assets/1.0.81/js/components/darla/client-js/darla.js', block: false, options:{}}, // whitelisted by @@||yimg.com/zz/combo?*&*.js
    { url: 'https://aax.amazon-adsystem.com/', block: true, options:{}, result: {parent: 'Amazon.com', reason: 'trackersWithParentCompany'}}, // ||amazon-adsystem.com^$third-party
    { url: 'https://0914.global.ssl.fastly.net/ad2/script/x.js?cb=1510932127199', block: false, options:{}}, // whitelisted by @@||fastly.net/ad2/$script
    { url: 'https://securepubads.g.doubleclick.net/gpt/pubads_impl_168.js', block: true, options:{}, result: {parent: 'Google', reason: 'trackersWithParentCompany'}}, // /securepubads.
    { url: 'https://shim.btrll.com/', block: true, options:{}, result: {parent: 'BrightRoll', reason: 'trackersWithParentCompany'}}, // ||btrll.com^$third-party
    { url: 'https:/somesite.com/webservices/jsparselinks.aspx?q=1', block: true, options: {type: 'SCRIPT'}}, // /webservices/jsparselinks.aspx?$script
    { url: 'https:/somesite.com/webservices/jsparselinks.aspx?q=1', block: false, options: {type: 'OBJECT'}}, // /webservices/jsparselinks.aspx?$script
    { url: 'http://ads.blogherads.com/73/7399/header.js', block: true, options: {type: 'OBJECT'}, result: {parent: 'BlogHer', reason: 'trackersWithParentCompany'}}, // /webservices/jsparselinks.aspx?$script
    { url: 'https://radar.cedexis.com/1/14290/radar.js', block: true, options: {type: 'OBJECT'}, result: {parent: 'Cedexis', reason: 'privacy'}}, // from easy privacy, ||cedexis.com^$third-party
    { url: 'https://connect.facebook.net/en_US/fbevents.js', block: true, options: {type: 'OBJECT'}, result: {parent: 'Facebook', reason: 'trackersWithParentCompany'}}, // from easy privacy,  ||connect.facebook.net^*/fbevents.js$third-party
    { url: 'https://connect.facebook.net/en_US/fbevents.js', block: false, options: {domain: 'facebook.com', type: 'OBJECT'}, result: {parent: 'Facebook', reason: 'first party'}}, // from easy privacy,  ||connect.facebook.net^*/fbevents.js$third-party
    { url: 'https://www.facebook.com/rsrc.php/v3/y6/r/69R6jxYtiKN.js', block: true, options: {domain: 'up-4ever.com', type: 'OBJECT'}, result: {parent: 'Facebook', reason: 'trackersWithParentCompany'}}, // |https://$third-party,script,domain=up-4ever.com
    { url: 'https://v.shopify.com/storefront/page?referrer=https%3A%2F%2Fwww.pinkbike.com&eventType=page', block: true, options: {domain: 'facebook.com', type: 'OBJECT'}, result: {reason: 'privacy'}}, // from easy privacy ||shopify.com/storefront/page?*&eventtype=
    { url: 'https://secureinclude.ebaystatic.com/js/v/us/pulsar.js', block: true, options: {type: 'SCRIPT', domain: 'ebay.com'}, result: {reason: 'privacy'}}, // easy privacy, ||ebaystatic.com^*/pulsar.js, tests domain anchor and wildcard
    { url: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js', block: false, options: {type: 'SCRIPT', domain: 'destructoid.com'}}, // @@||maxcdn.bootstrapcdn.com^$script,domain=destructoid.com, test whitelist with options
  ];
  
  QUnit.test("abp blocking url", function (assert) {
      // turn social blocking on for this test
      bkg.settings.updateSetting('socialBlockingIsEnabled', true);
      
      abpBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', true);

          let testTab = Object.assign({}, JSON.parse(JSON.stringify(fakeTab)))

          if(test.options.domain) {
              testTab.url = test.options.domain
              testTab.site.domain = test.options.domain
          }

          if (test.options.type) 
              fakeRequest.type = test.options.type

          let toBlock = bkg.trackers.isTracker(test.url, testTab, fakeRequest) || {block: false};
          assert.ok(toBlock.block === test.block, `abp blocking decision.. url: ${test.url} ${toBlock.block} === ${test.block}`);
          console.log(test.url)
          console.log(toBlock.reason)
          console.log(toBlock.parentCompany)

          if (test.result) {
              if (test.result.parent) assert.ok(test.result.parent === toBlock.parentCompany, `has correct parent company ${test.result.parent} === ${toBlock.parentCompany}`)
              if (test.result.reason) assert.ok(test.result.reason === toBlock.reason, `has correct blocking reason ${test.result.reason} === ${toBlock.reason}`)
          }
      });
  });

  QUnit.test("turn off blocking", function (assert) {
      basicBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', false);
          var toBlock = bkg.trackers.isTracker(test.url, fakeTab, fakeRequest);
          toBlock = toBlock ? toBlock.block : false;
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
              site: {domain: bkg.utils.extractHostFromURL(test.url)}
          }

          var toBlock = bkg.trackers.isTracker(test.potentialTracker, testTab, fakeRequest);
          toBlock = toBlock ? toBlock.block : false;
          assert.ok(toBlock === test.block, test.message);
      });
  });

  var socialBlocking = [
    { url: 'https://facebook.com/?q=something&param=a'},
    { url: 'http://twitter.com/somescript.js'}
  ];
  
  QUnit.test("social blocking", function (assert) {
      socialBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', true);
          bkg.settings.updateSetting('socialBlockingIsEnabled', true);
          let toBlock = bkg.trackers.isTracker(test.url, fakeTab, fakeRequest);
          toBlock = toBlock ? toBlock.block : false;
          assert.ok(toBlock === true, 'url should be blocked');
      });
  
      socialBlocking.forEach(function(test) {
          bkg.settings.updateSetting('trackerBlockingEnabled', true);
          bkg.settings.updateSetting('socialBlockingIsEnabled', false);
          let toBlock = bkg.trackers.isTracker(test.url, fakeTab, fakeRequest);
          toBlock = toBlock ? toBlock.block : false;
          assert.ok(toBlock === false, 'url should be blocked');
      });
  });

  // Some basic tests for the abp module. These should be expanded to cover all abp filter options
  QUnit.test("Test abp matching", (assert) => {
      
      // testEasylist is defined in testEasylist.js
      let fakeEasylist = testEasylist.join('\n')
      let fakeRegexList = regexList.join('\n')

      let parsedList = {}
      bkg.abp.parse(fakeEasylist, parsedList)
      bkg.abp.parse(fakeRegexList, parsedList)

      easylistTestCases.forEach((e) => {
          let domain = e.options.domain || 'test.com'
          let type = e.options.type || 'SCRIPT'

          let match = bkg.abp.matches(parsedList, e.url, {
              domain: domain,
              elementTypeMask: bkg.abp.elementTypes[type]
          })
          
          assert.ok(match === e.block, `Got correct blocking decision. ${match} === ${e.block}, ${e.url} ${JSON.stringify(e.options)}`)
      })
  })

  var surrogateBlocking = [
    { url: 'https://google-analytics.com/ga.js' },
    { url: 'https://www.google-analytics.com/ga.js' },
    { url: 'https://www.googletagservices.com/tag/js/gpt.js' },
    // from nytimes.com:
    { url: 'https://www.googletagmanager.com/gtm.js?id=GTM-WF9QCL2&gtm_auth=28ykelszAvyta5q5YGRVOg&gtm_preview=env-53&gtm_cookies_win=x' }
  ];

  QUnit.test("surrogateBlocking", function (assert) {
      surrogateBlocking.forEach(function(test) {
          let testTab = {
              tabId: 0,
              url: test.url,
              site: {domain: bkg.utils.extractHostFromURL(test.url)}
          }

          let result = bkg.trackers.isTracker(test.url, fakeTab, fakeRequest);
          assert.ok(result, 'should be flagged as a tracker')
          assert.ok(result.block, 'should be blocked')
          assert.ok(result.redirectUrl, 'should be redirected to new url')
          assert.ok(result.redirectUrl.match(/data:application\/javascript;base64/), 'should be a data URI as redirect url')
      });
  });

})();
