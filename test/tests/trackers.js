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
    { url: 'https://googleads.g.doubleclick.net/pagead/id', block: true, options:{}, result: {parent: 'Google', reason: 'trackersWithParentCompany'}}, // /googleads.
    { url: 'http://ads.rubiconproject.com/header/11078.js', block: true, options:{}, result: {parent: 'Fox One Stop Media', reason: 'trackersWithParentCompany'}}, //  ||rubiconproject.com^$third-party
    { url: 'https://s.yimg.com/rq/darla/3-0-2/js/g-r-min.js', block: false, options: {domain: 'yahoo.com'}}, // @@||yimg.com/rq/darla/*/g-r-min.js$domain=yahoo.com
    { url: 'https://s.yimg.com/zz/combo?yt/y7/assets/1.0.81/js/components/darla/client-js/darla.js', block: false, options:{}}, // whitelisted by @@||yimg.com/zz/combo?*&*.js
    { url: 'https://aax.amazon-adsystem.com/', block: true, options:{}, result: {parent: 'Amazon.com', reason: 'trackersWithParentCompany'}}, // ||amazon-adsystem.com^$third-party
    { url: 'https://0914.global.ssl.fastly.net/ad2/script/x.js?cb=1510932127199', block: false, options:{}}, // whitelisted by @@||fastly.net/ad2/$script
    { url: 'https://securepubads.g.doubleclick.net/gpt/pubads_impl_168.js', block: true, options:{}, result: {parent: 'Google', reason: 'trackersWithParentCompany'}}, // /securepubads.
    { url: 'https://shim.btrll.com/', block: true, options:{}, result: {parent: 'BrightRoll', reason: 'trackersWithParentCompany'}}, // ||btrll.com^$third-party
    { url: 'http://ads.blogherads.com/73/7399/header.js', block: true, options: {type: 'object'}, result: {parent: 'BlogHer', reason: 'trackersWithParentCompany'}}, // /webservices/jsparselinks.aspx?$script
    { url: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js', block: false, options: {type: 'script', domain: 'destructoid.com'}}, // @@||maxcdn.bootstrapcdn.com^$script,domain=destructoid.com, test whitelist with options
    //
    //
    //// testing social blocking from our own data structure
    { url: 'https://facebook.com', block: false, options:{domain: 'test.com'}}, // we have rules so shouldn't block this
    { url: 'https://facebook.net', block: false, options:{domain: 'test.com'}}, // we have rules so shouldn't block this
    { url: 'https://twitter.com', block: false, options:{domain: 'test.com'}}, // we have rules so shouldn't block this
    { url: 'https://linkedin.com', block: false, options:{domain: 'test.com'}}, // we have rules so shouldn't block this
    { url: 'https://facebook.com/asdf/impression.php', block: true, options: {type: 'script', domain: 'yahoo.com'}, result: {parent: 'Facebook', rule:{rule:'facebook\\.com.*\\/impression\\.php'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://facebook.com/asdf/impression.php', block: false, options: {type: 'script', domain: 'facebook.com'}, result: {parent: 'Facebook', rule:{rule:'facebook\\.com.*\\/impression\\.php'}, reason: 'first party'}},
    { url: 'https://connect.facebook.net/en_US/fbevents.js', block: true, options: {type: 'object'}, result: {parent: 'Facebook', rule:{rule:'connect\\.facebook\\.net[?/].*\\/fbevents\\.js'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://connect.facebook.net/asdf/en_US/fbevents.js', block: true, options: {type: 'object'}, result: {parent: 'Facebook', rule:{rule:'connect\\.facebook\\.net[?/].*\\/fbevents\\.js'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://connect.facebook.net/en_US/fbevents.js', block: false, options: {domain: 'facebook.com', type: 'object'}, result: {parent: 'Facebook', rule:{rule:'connect\\.facebook\\.net[?/].*\\/fbevents\\.js'}, reason: 'first party'}},
    { url: 'https://graph.facebook.com/?ids=asf3454534&callback=somefunction', block: true, options: {type: 'script', domain: 'reddit.com'}, result: {parent: 'Facebook', rule:{rule:'graph\\.facebook\\.com\\/\\?ids=.*&callback=.*'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://pixel.facebook.com', block: true, options: {domain: 'gmail.com'}, result: {parent: 'Facebook', rule:{rule:'pixel\\.facebook\\.com($|[?/])'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://pixel.facebook.com?a=asdf', block: true, options: {domain: 'gmail.com'}, result: {parent: 'Facebook', rule:{rule:'pixel\\.facebook\\.com($|[?/])'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://pixel.facebook.com/asdf', block: true, options: {domain: 'gmail.com'}, result: {parent: 'Facebook', rule:{rule:'pixel\\.facebook\\.com($|[?/])'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://pixel.facebook.com/asdf', block: true, options: {domain: 'gmail.com'}, result: {parent: 'Facebook', rule:{rule:'pixel\\.facebook\\.com($|[?/])'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://facebook.com/ai.php?', block: true, options: {domain: 'gmail.com'}, result: {parent: 'Facebook', rule:{rule:'facebook\\.com\\/ai\\.php\\?'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://facebook.com/ai.php?a=asdf', block: true, options: {domain: 'gmail.com'}, result: {parent: 'Facebook', rule:{rule:'facebook\\.com\\/ai\\.php\\?'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://facebook.com/ai.php', block: false, options: {domain: 'gmail.com'}}, // doesn't match any rules
    { url: 'https://facebook.com/audience_network/', block: true, options: {domain: 'gmail.com', type: 'image'}, result: {parent: 'Facebook', rule:{rule:'facebook\\.com\\/audience_network\\/'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://facebook.com/audience_network/', block: false, options: {domain: 'gmail.com', type: 'script'}}, // wrong request type doesn't match rule
    { url: 'https://facebook.com/asdfasd/plugins/send_to_messenger.php?app_id=asdf', block: true, options: {domain: 'gmail.com'}, result: {parent: 'Facebook', rule:{rule:'facebook\\.com\\/.*\\/plugins\\/send_to_messenger\\.php\\?app_id='}, reason: 'trackersWithParentCompany'}},
    // domain options
    { url: 'https://facebook.net/asdf/audiencenetworkvpaid.php', block: true, options: {domain: 'dailymotion.com'}, result: {parent: 'Facebook', rule: {rule: 'facebook\\.net[?/].*\\/AudienceNetworkVPAID\\.'}, reason: 'trackersWithParentCompany'}},
    { url: 'https://facebook.net/asdf/audiencenetworkvpaid.php', block: false, options: {domain: 'test.com'}},
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

          if (test.options.type) { 
              fakeRequest.type = test.options.type
          }

          fakeRequest.url = test.url

          let toBlock = bkg.trackers.isTracker(test.url, testTab, fakeRequest) || {block: false};
          assert.ok(toBlock.block === test.block, `abp blocking decision.. url: ${test.url} ${toBlock.block} === ${test.block}`);

          if (test.result) {
              if (test.result.parent) assert.ok(test.result.parent === toBlock.parentCompany, `has correct parent company ${test.result.parent} === ${toBlock.parentCompany}`)
              if (test.result.reason) assert.ok(test.result.reason === toBlock.reason, `has correct blocking reason ${test.result.reason} === ${toBlock.reason}`)
              if (test.result.rule) {
                  if (test.result.rule.rule) {
                      let regexRule = new RegExp(test.result.rule.rule + '.*', 'i')
                      assert.ok(`${regexRule}` === `${toBlock.rule.rule}`, `has correct blocking rule ${regexRule} === ${toBlock.rule.rule}`)
                  }
              }
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
          let type = e.options.type || 'script'

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
