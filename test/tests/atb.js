(function() {
  bkg.settings.ready().then(() => {
      QUnit.module("ATB");
      testATBrewrite()
      testATBInstall()
  })
})()

function testATBrewrite() {
  QUnit.test("ATB module url rewrite", function (assert) {
      
      // don't update atb values if they don't already exist
      bkg.settings.updateSetting('set_atb', null);
      bkg.ATB.updateSetAtb().then().catch((message) => {
          assert.ok(message, 'should not set a new atb if one doesnt exist already: ' + message);
      });
      
      // test getting new atb values from atb.js
      var fakeSetAtb = "fakeatbvalue";
      bkg.settings.updateSetting('set_atb', fakeSetAtb);
      bkg.ATB.updateSetAtb().then((res) => {
          assert.ok(bkg.settings.getSetting('set_atb') === res, "should have a new set_atb value: " + res)
      });
      
      // test anchor tag rewrite
      bkg.settings.updateSetting('atb', 'v70-6')
      bkg.settings.updateSetting('set_atb', 'v70-6')
  });
}

function testATBInstall () {
  QUnit.test("ATB install flow", function (assert) {
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

          assert.ok(atb, `got new atb value from success page ${atb}`);
          assert.ok(set_atb, `got new set_atb value from success page ${set_atb}`);
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
  })
}
