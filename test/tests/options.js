(function() {
  QUnit.module("Options");
  
  QUnit.test("global blocking off/on", function (assert) {
      let tabsToCleanUp = [];
      let testURL = "https://www.reddit.com/";
      var done = assert.async();

      // turn blocking off
      bkg.settings.updateSetting('trackerBlockingEnabled', false);
      assert.ok(bkg.settings.getSetting('trackerBlockingEnabled') === false);

      chrome.tabs.create({url: testURL});

      getLoadedTab(testURL).then((tab) => {
          tabsToCleanUp.push(tab);

          let tabObj = bkg.tabManager.get({tabId: tab.id})

          assert.ok(tabObj.site.trackerUrls.length === 0, 'tracking should be off');

          // switch blocking back on and reload
          bkg.settings.updateSetting('trackerBlockingEnabled', true);
          assert.ok(bkg.settings.getSetting('trackerBlockingEnabled') === true);
          chrome.tabs.reload(tab.id, () => {
              
              getLoadedTab(testURL).then((tab) => {
                
                let tabObj = bkg.tabManager.get({tabId: tab.id})
                assert.ok(tabObj.site.trackerUrls.length !== 0, 'should be blocking trackers');
                done();
                cleanUpTabs(tabsToCleanUp);
              });

          });
      });

  });
})();
