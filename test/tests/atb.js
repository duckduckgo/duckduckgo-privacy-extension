(function() {
 
  let ddgTestUrl = "https://duckduckgo.com/?q=test"
  QUnit.module("ATB");
  
  QUnit.test("Testing ATB module", function (assert) {
      
      // test appending atb value to only ddg urls
      var urlTests = [
      { 'url': 'http://duckduckgo.com/?q=something', 'rewrite': true },
      { 'url': 'https://duckduckgo.com/?q=something', 'rewrite': true },
      { 'url': 'https://twitter.com', 'rewrite': false },
      { 'url': 'https://twitter.com/?u=duckduckgo.com', 'rewrite': false }
      ];

      urlTests.forEach(function(testRequest){
          let toRewrite = ATB.redirectURL(testRequest);
          let rewrite = false;

          if(toRewrite && toRewrite['redirectUrl']){
              rewrite = true;
          }

          assert.ok(rewrite === testRequest.rewrite, "correctly rewrite only ddg URLs: " + testRequest.url);   
      });

      // don't update atb values if they don't already exist
      settings.updateSetting('set_atb', null);
      ATB.updateSetAtb().then().catch((message) => {
          assert.ok(message, 'should not set a new atb if one doesnt exist already: ' + message);
      });

      // test getting new atb values from atb.js
      var fakeSetAtb = "fakeatbvalue";
      settings.updateSetting('set_atb', fakeSetAtb);
      ATB.updateSetAtb().then((res) => {
              assert.ok(settings.getSetting('set_atb') === res, "should have a new set_atb value: " + res)
      });

          
      var done = assert.async();
      // check new tab url
      chrome.tabs.create({url: ddgTestUrl});
      
      getLoadedTab().then((tab) => {
          let atbRegex = new RegExp('&atb=' + settings.getSetting('atb'),'g');
          assert.ok(atbRegex.exec(tab.url), "new tab url has atb param");
          done();
      });
  });

  function getLoadedTab(){
      return new Promise ((resolve) => {
          chrome.tabs.query({url: ddgTestUrl + '*', }, (tabs) => {
              if(tabs){
                  let tab = tabs[0];
                  if(tab.status === 'complete'){
                    resolve(tab);
                  }
                  else{
                      resolve(getLoadedTab());
                  }
              }
          });
      });
  }
})();
