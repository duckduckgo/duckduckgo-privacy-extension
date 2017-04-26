(function() {
  QUnit.module("utils");

  var utils = require('stats');
  var trackers = [
  { "parent": "Google", 'currURL': "reddit.com", "tracker": "doubleclick.net"}
  ];

  QUnit.test("add tracker to stats", function (assert) {
      var testData = { "parent": "Google", 'currURL': "reddit.com", "tracker": "doubleclick.net"};
      // add a bunch of data to stats
      for(var i = 0; i < 10; i++){
          stats.update(testData.parent, testData.currURL, testData.tracker);
      }
      var topBlocked = stats.getTopBlocked();
      assert.ok(topBlocked.length !== 0, 'topBlocked has data');

      // add another tracker
      stats.update("SomeOtherCompany", testData.currURL, testData.tracker);

      topBlocked = stats.getTopBlocked();

      assert.ok(topBlocked[0].name === testData.parent, "has correct top blocked company");
  });

})();
