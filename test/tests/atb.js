(function() {
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
          let toRewrite = atb.redirectURL(testRequest);
          let rewrite = false;

          if(toRewrite && toRewrite['redirectUrl']){
              rewrite = true;
          }

          assert.ok(rewrite === testRequest.rewrite, "correctly rewrite only ddg URLs: " + testRequest.url);   
      });

      // test getting new atb values from atb.js
      var fakeSetAtb = "fakeatbvalue";
      settings.updateSetting('set_atb', fakeSetAtb);
      atb.updateSetAtb().then((res) => {
              assert.ok(settings.getSetting('set_atb') !== fakeSetAtb, "should have a new set_atb value")
      });

  });
})();
