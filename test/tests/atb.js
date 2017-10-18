(function() {
  bkg.settings.ready().then(() => {
      QUnit.module("ATB");
      testATBrewrite()
      testATBInstall()
  })
})()

function testATBrewrite() {
  QUnit.test("ATB module url rewrite", function (assert) {
      var urlTests = [
      {url: 'http://duckduckgo.com/?q=something', rewrite: true },
      {url: 'https://duckduckgo.com/?q=something', rewrite: true },
      {url: 'https://duckduckgo.com/?q=something&atb=v70-1', rewrite: false },
      {url: 'https://duckduckgo.com/?q=atb', rewrite: true},
      {url: 'https://duckduckgo.com/js/spice/forecast/Denver%20Colorado%20United%20States/en', rewrite: false},
      {url: 'https://twitter.com', rewrite: false },
      {url: 'https://twitter.com/?u=duckduckgo.com', rewrite: false },
      {url: 'https://icons.duckduckgo.com/ip2/weather.com.ico', rewrite: false},
      {url: 'https://duckduckgo.com/t/ias_meanings?6753163&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false},
      {url: 'https://duckduckgo.com/share/spice/forecast/1347/forecast.css', rewrite: false},
      {url: 'https://duckduckgo.com/t/iaui?7725756&oi=forecast&r0=forecast&r1=forecast&r2=forecast&r5=en_wikipedia_queries,nlp_fathead,nlp_wiki&r8=news&r16=news&r19=forecast&r28=apps_domains&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false},
      {url: 'https://www.reddit.com/search?q=duckduckgo', rewrite: false},
      {url: 'https://duckduckgo.com/?q=whois+https://duckduckgo.com/?q=whois', rewrite: true},
      {url: 'https://beta.duckduckgo.com/t/ias_meanings?6753163&q=weather&ct=US&d=m&kl=wt-wt', rewrite: false},
      {url: 'https://beta.duckduckgo.com/share/spice/forecast/1347/forecast.css', rewrite: false},
      {url: 'http://beta.duckduckgo.com/?q=something', rewrite: true },
      {url: 'https://beta.duckduckgo.com/?q=something', rewrite: true },
      {url: 'https://beta.duckduckgo.com/?q=something&atb=v70-1', rewrite: false },
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
