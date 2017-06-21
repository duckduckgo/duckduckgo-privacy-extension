(function() {
  QUnit.module("Sites");

  QUnit.test("test sites and site classes", function (assert) {
      Sites.clearData();
      settings.updateSetting('whitelist', '');

      var domain = "test.com";
      var newSite = new Site(domain);

      assert.ok(newSite.domain === domain, 'site has correct name');
      assert.ok(newSite.isWhiteListed() === false, 'site is not whitelisted by default');
      
      newSite.setWhitelisted(true);
      assert.ok(newSite.isWhiteListed() === true, 'whitelisting a site works');

      newSite.addTracker('doubleclick.net');
      var trackerList = newSite.getTrackers();
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
          let site = Sites.add(utils.extractHostFromURL(test[0]));
          assert.ok(site.domain === test[1], "site should have the correct domain");
      });
  });
})();
