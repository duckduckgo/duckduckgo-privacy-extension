(function() {
  QUnit.module("ATB");
  
  QUnit.test("Testing ATB module", function (assert) {
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

  });
})();
