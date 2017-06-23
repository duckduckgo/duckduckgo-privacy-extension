(function() {
  QUnit.module("Options");
  
  QUnit.test("global blocking off/on", function (assert) {
      let tabsToCleanUp = [];
      let testURL = "https://www.reddit.com/";
      var done = assert.async();

      // turn blocking off
      settings.updateSetting('trackerBlockingEnabled', false);
      assert.ok(settings.getSetting('trackerBlockingEnabled') === false);

      chrome.tabs.create({url: testURL});

      getLoadedTab(testURL).then((tab) => {
          tabsToCleanUp.push(tab);

          let tabObj = tabManager.get({tabId: tab.id})

          assert.ok(tabObj.site.trackers.length === 0, 'tracking should be off');

          // switch blocking back on and reload
          settings.updateSetting('trackerBlockingEnabled', true);
          assert.ok(settings.getSetting('trackerBlockingEnabled') === true);
          chrome.tabs.reload(tab.id, () => {
              
              getLoadedTab(testURL).then((tab) => {
                
                let tabObj = tabManager.get({tabId: tab.id})
                assert.ok(tabObj.site.trackers.length !== 0, 'should be blocking trackers');
                done();
                cleanUpTabs(tabsToCleanUp);
              });

          });
      });

  });

  function getLoadedTab(tabUrl){
      return new Promise((resolve) => {
          chrome.tabs.query({url: tabUrl + '*', }, (tabs) => {
              if(tabs){
                  let tab = tabs[0];
                  if(tab && tab.status === "complete"){
                      resolve(tab);
                  }
                  else{
                      resolve(getLoadedTab(tabUrl));
                  }
              }
          });
      });
  }

  function cleanUpTabs(tabsToCleanUp){
      tabsToCleanUp.forEach((tab) => {
          chrome.tabs.remove(tab.id);
      });
  }
})();
