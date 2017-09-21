(function() {
  QUnit.module("Sites");

  QUnit.test("test sites and site classes", function (assert) {
      bkg.settings.updateSetting('whitelist', '');

      var domain = "test.com";
      var newSite = new Site(domain)

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
          let site = new Site(utils.extractHostFromURL(test[0]));
          assert.ok(site.domain === test[1], "site should have the correct domain");
      });
  });

  QUnit.test("test site score", function (assert) {

      let tests = [
          { values: {hasHTTPS:false, inMajorTrackingNetwork:false, totalBlocked: 0, hasObscureTracker: false}, result: 'B'},
          { values: {hasHTTPS:true, inMajorTrackingNetwork:false, totalBlocked: 0, hasObscureTracker: false}, result: 'A'},
          { values: {hasHTTPS:true, inMajorTrackingNetwork:true, totalBlocked: 1, hasObscureTracker: false}, result: 'C'},
          { values: {hasHTTPS:true, inMajorTrackingNetwork:true, totalBlocked: 11, hasObscureTracker: false}, result: 'D'},
          { values: {hasHTTPS:false, inMajorTrackingNetwork:false, totalBlocked: 9, hasObscureTracker: false}, result: 'C'},
          { values: {hasHTTPS:false, inMajorTrackingNetwork:true, totalBlocked: 10, hasObscureTracker: false}, result: 'D'},
          { values: {hasHTTPS:false, inMajorTrackingNetwork:false, totalBlocked: 20, hasObscureTracker: false}, result: 'D'},
          { values: {hasHTTPS:false, inMajorTrackingNetwork:false, totalBlocked: 20, hasObscureTracker: true}, result: 'D'},
          { values: {hasHTTPS:false, inMajorTrackingNetwork:false, totalBlocked: 1, hasObscureTracker: true}, result: 'D'},
          { values: {hasHTTPS:true, inMajorTrackingNetwork:true, totalBlocked: 1, hasObscureTracker: false}, result: 'C'},

      // test tosdr scores
          { values: {hasHTTPS:false, inMajorTrackingNetwork:false, totalBlocked: 0, hasObscureTracker: false, tosdr: {score: 100}}, result: 'C'},
          { values: {hasHTTPS:false, inMajorTrackingNetwork:false, totalBlocked: 0, hasObscureTracker: false, tosdr: {score: -100}}, result: 'A'},
          { values: {hasHTTPS:false, inMajorTrackingNetwork:false, totalBlocked: 0, hasObscureTracker: false, tosdr: {score: 0}}, result: 'B'}
      ]

      tests.map(test => {
          let site = new Site('test.com');

          for(var value in test.values) {
              site.score[value] = test.values[value];
          }

          assert.ok(site.score.get() === test.result, "site should have the correct site score");
      });
  });

  QUnit.test('test tosdr site scores', function(assert) {
      for (var tosdrUrl in tosdr) {
          let site = new Site(tosdrUrl)
          if (tosdr[tosdrUrl].hasOwnProperty('score')) {
              assert.ok(site.score.tosdr.score === tosdr[tosdrUrl].score, 'site object has correct tosdr score')
          }
      }

      // this should not have a tosdr entry
      let site = new Site('instagram.x.com')
      assert.ok(Object.keys(site.score.tosdr).length === 0, 'site should not have tosdr data')

  });

})();
