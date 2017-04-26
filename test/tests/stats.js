(function() {
  QUnit.module("stats");

  var utils = require('stats');
  var trackers = [
  { "parent": "Google", 'currURL': "reddit.com", "tracker": "doubleclick.net"}
  ];

  QUnit.test("add tracker to stats", function (assert) {
      var testData = { "parent": "Google", 'currURL': "reddit.com", "tracker" : {"count": 1, "url": "doubleclick.net"}};
      // add a bunch of data to stats
      var entriesToAdd = 10;
      for(var i = 0; i < entriesToAdd; i++){
          stats.update(testData.parent, testData.currURL, testData.tracker);
      }
      var topBlocked = stats.getTopBlocked();
      assert.ok(topBlocked.length !== 0, 'topBlocked has data');

      stats.update("SomeOtherCompany", testData.currURL, testData.tracker);
      topBlocked = stats.getTopBlocked();
      assert.ok(topBlocked[0].name === testData.parent, "has correct top blocked company");
      assert.ok(topBlocked[0].count === entriesToAdd, "has correct count for top blocked company");
  });

})();
