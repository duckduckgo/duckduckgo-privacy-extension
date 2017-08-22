(function() {
 
  QUnit.module("ATB");
  QUnit.test("Test ATB migration", function (assert) {
      
      // clear any existing atb before we start the tests
      bkg.settings.updateSetting('atb', '');
      bkg.settings.updateSetting('set_atb', '');

      // make some fake atb values in localStorage
      bkg.localStorage['atb'] = 'old-atb-value';
      bkg.localStorage['set_atb'] = 'old-set-atb-value';

      bkg.ATB.migrate();

      assert.ok(bkg.settings.getSetting('atb') === "old-atb-value", "ATB value should be migrated to setting");
      assert.ok(bkg.settings.getSetting('set_atb') === "old-set-atb-value", "set ATB value should be migrated to setting");

      // Try to migrate again. This shouldn't overwrite the now existing storage ATB values
      bkg.localStorage['atb'] = 'some-other-value';
      bkg.localStorage['set_atb'] = 'some-other-set-atb-value';

      bkg.ATB.migrate();

      assert.ok(bkg.settings.getSetting('atb') === "old-atb-value", "migrate should not overwrite existing ATB");
      assert.ok(bkg.settings.getSetting('set_atb') === "old-set-atb-value", "migrate should not overwrite existing ATB");

  });

  QUnit.test("Testing ATB module", function (assert) {

      // test appending atb value to only ddg urls
      var urlTests = [
      { 'url': 'http://duckduckgo.com/?q=something', 'rewrite': true },
      { 'url': 'https://duckduckgo.com/?q=something', 'rewrite': true },
      { 'url': 'https://twitter.com', 'rewrite': false },
      { 'url': 'https://twitter.com/?u=duckduckgo.com', 'rewrite': false }
      ];

      urlTests.forEach(function(testRequest){
          // make sure we have atb set to something
          bkg.settings.updateSetting('atb', 'testATB');

          let toRewrite = bkg.ATB.redirectURL(testRequest);
          let rewrite = false;

          if(toRewrite && toRewrite['redirectUrl']){
              rewrite = true;
          }

          assert.ok(rewrite === testRequest.rewrite, "correctly rewrite only ddg URLs: " + testRequest.url);   
      });

      // don't update atb values if they don't already exist
      bkg.settings.updateSetting('set_atb', null);
      bkg.ATB.updateSetAtb().then().catch((message) => {
          assert.ok(message, 'should not set a new atb if one doesnt exist already: ' + message);
      });

      // test getting new atb values from atb.js
      var fakeSetAtb = "fakeatbvalue";
      bkg.settings.updateSetting('set_atb', fakeSetAtb);
      bkg.ATB.updateSetAtb().then((res) => {
              assert.ok(settings.getSetting('set_atb') === res, "should have a new set_atb value: " + res)
      });

      // test anchor tag rewrite
      bkg.settings.updateSetting('atb', 'v70-6')
      bkg.settings.updateSetting('set_atb', 'v70-6')

      let anchorRewrite = bkg.ATB.redirectURL({ 'url': 'https://duckduckgo.com/about#newsletter'})
      assert.ok(anchorRewrite.redirectUrl === 'https://duckduckgo.com/about&atb=v70-6#newsletter', 'rewrite ddg URLs with anchor tags')

  });

  QUnit.test("Testing ATB Install flow", function (assert) {
      // test atb rewrite in new tab    
      var done = assert.async();
      var tabsToCleanUp = [];

      // get atb and set_atb values from a fresh install using the ATB success page
      var  atbSuccessPage = "https://duckduckgo.com/?exti=2";
      bkg.settings.updateSetting('atb', null);
      bkg.settings.updateSetting('set_atb', null);
      assert.ok(!bkg.settings.getSetting('atb'), "atb setting was cleared");
      assert.ok(!bkg.settings.getSetting('set_atb'), "set_atb setting was cleared");
      chrome.tabs.create({url: atbSuccessPage});

      // Run ATB onInstall to simulate an install through the ATB modal
      getLoadedTab("https://duckduckgo.com/?").then((tab) => {
          bkg.ATB.onInstalled();
          let atb = bkg.settings.getSetting('atb');
          let set_atb = bkg.settings.getSetting('set_atb');

          assert.ok(atb, "got new atb value from success page");
          assert.ok(set_atb, "got new set_atb value from success page");
          tabsToCleanUp.push(tab);
          
          var ddgTestUrl = "https://duckduckgo.com/?q=test"
      
          // check new tab url
          chrome.tabs.create({url: ddgTestUrl});
          
          getLoadedTab(ddgTestUrl).then((tab) => {
              let atbRegex = new RegExp('&atb=' + bkg.settings.getSetting('atb'),'g');
              assert.ok(atbRegex.exec(tab.url), "new tab url has atb param");
              tabsToCleanUp.push(tab);
              cleanUpTabs(tabsToCleanUp);
          });
          done()
      });
  });
})();
