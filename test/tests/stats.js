(function() {
  QUnit.module("stats");

  var stats = require('stats');
  stats.clearStats();

  var trackers = [
  { "parent": "Google", 'currURL': "reddit.com", "tracker": "doubleclick.net"}
  ];

  QUnit.test("basic stats test", function (assert) {
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

  QUnit.test("add random generated stats data", function (assert) {
      var parents = ['Google', 'Adobe', 'Amazon', 'Facebook', 'Twitter'];
      var urls = ["reddit.com", "facebook.com", "amazon.com"];
      var trackers = ["doubleclick.net", "moat.com"];
      var entriesToAdd = 15;
      var randomData = {};
      stats.clearStats();

      for(var i = 0; i < entriesToAdd; i++){
          var parent = getRandom(parents);
          var count = Math.floor(Math.random()*20);
          randomData[parent] = randomData[parent] ? randomData[parent] += count: count;

          var entry = {"parent": parent, "currURL": getRandom(urls), "tracker" : {"count": count, "url": getRandom(trackers)}};
          
          stats.update(entry.parent, entry.currURL, entry.tracker);
      }

      var topBlocked = stats.getTopBlocked();
      var lastCount;
      for(var i = 0; i < topBlocked.length; i++){
          if(lastCount){
              assert.ok(topBlocked[i].count <= lastCount, "array is sorted");
          }
          assert.ok(topBlocked[i].count === randomData[topBlocked[i].name], "random data was correctly totaled");
          lastCount = topBlocked[i].count;
      }
  });

  function getRandom(list){
      return list[Math.floor(Math.random()*list.length)]
  }

})();
