(function() {
  QUnit.module("Sites");

  QUnit.test("test sites and site classes", function (assert) {
      bkg.settings.updateSetting('whitelist', '');

      var domain = "test.com";
      var newSite = new bkg.Site(domain)

      assert.ok(newSite.domain === domain, 'site has correct name');
      assert.ok(newSite.isWhiteListed() === undefined, 'site is not whitelisted by default');
      
      newSite.setWhitelisted('whitelisted', true);
      assert.ok(newSite.isWhiteListed() === true, 'whitelisting a site works');

      newSite.addTracker({url: 'doubleclick.net'});
      var trackerList = newSite.trackerUrls;
      assert.ok(trackerList.length === 1, "add a tracker and get list");
      assert.ok(trackerList.indexOf('doubleclick.net') !== -1, "tracker list has correct domain");
  });

  QUnit.test("test site domains", function (assert) {
      // url -> expected processed site domain
      let tests = [
          ['http://192.168.1.0/', '192.168.1.0'],
          ['http://www.independent.co.uk/us', 'independent.co.uk']
      ];

      tests.map((test) => {
          let site = new bkg.Site(bkg.utils.extractHostFromURL(test[0]));
          assert.ok(site.domain === test[1], "site should have the correct domain");
      });
  });

  QUnit.test('test tosdr site scores', function(assert) {
      for (var tosdrUrl in bkg.tosdr) {
          let site = new bkg.Site(tosdrUrl)
          if (bkg.tosdr[tosdrUrl].hasOwnProperty('score')) {
              assert.ok(site.score.tosdr.score === bkg.tosdr[tosdrUrl].score, 'site object has correct tosdr score')
          }
      }

      // this should not have a tosdr entry
      let site = new bkg.Site('instagram.x.com')
      assert.ok(Object.keys(site.score.tosdr).length === 0, 'site should not have tosdr data')

  });

})();
