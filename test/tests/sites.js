(function() {
  QUnit.module("Sites");

  QUnit.test("test sites and site classes", function (assert) {
      settings.updateSetting('whitelist', '');

      var domain = "test.com";
      var newSite = new Site(domain);

      assert.ok(newSite.domain === domain, 'site has correct name');
      assert.ok(newSite.isWhiteListed() === undefined, 'site is not whitelisted by default');
      
      newSite.setWhitelisted('whitelisted', true);
      assert.ok(newSite.isWhiteListed() === true, 'whitelisting a site works');

      newSite.addTracker({url: 'doubleclick.net'});
      var trackerList = newSite.trackers;
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
          let site = new Site(utils.extractHostFromURL(test[0]));
          assert.ok(site.domain === test[1], "site should have the correct domain");
      });
  });

  QUnit.test("test site score", function (assert) {

      let tests = [
          { values: {noHTTPS:false, topCompany:false, totalBlocked: 0, obscureTracker: false}, result: 'A'},
          { values: {noHTTPS:true, topCompany:false, totalBlocked: 0, obscureTracker: false}, result: 'B'},
          { values: {noHTTPS:true, topCompany:true, totalBlocked: 1, obscureTracker: false}, result: 'D'},
          { values: {noHTTPS:true, topCompany:true, totalBlocked: 1, obscureTracker: false}, result: 'D'},
          { values: {noHTTPS:true, topCompany:true, totalBlocked: 11, obscureTracker: false}, result: 'F'},
          { values: {noHTTPS:false, topCompany:false, totalBlocked: 9, obscureTracker: false}, result: 'B'},
          { values: {noHTTPS:false, topCompany:true, totalBlocked: 10, obscureTracker: false}, result: 'C'},
          { values: {noHTTPS:false, topCompany:false, totalBlocked: 20, obscureTracker: false}, result: 'C'},
          { values: {noHTTPS:false, topCompany:false, totalBlocked: 20, obscureTracker: true}, result: 'D'},
          { values: {noHTTPS:false, topCompany:false, totalBlocked: 1, obscureTracker: true}, result: 'C'}
      ]

      tests.map(test => {
          let site = new Site('test.com');

          for(var value in test.values) {
              site.score[value] = test.values[value];
          }

          assert.ok(site.score.get() === test.result, "site should have the correct site score");
      });
  });

})();
