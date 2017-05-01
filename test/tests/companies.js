(function() {
  QUnit.module("Companies");
  
  QUnit.test("test companies and company classes", function (assert) {
      Companies.clearData();
      
      var company = Companies.add('Twitter');
      assert.ok(company.getCount() === 1, "has correct initial count");

      company.incrementCount();
      assert.ok(company.getCount() === 2, "increment count");
      
      Companies.clearData();

      var sortedData = {
          "Facebook": 10,
          "MSN": 8,
          "Reddit": 2
      };

      var sortedList = ["Facebook", "MSN", "Reddit"];

      sortedList.forEach(function(c){
          var newCompany = Companies.add(c);
          newCompany.setCount(sortedData[c]);
      });

      var sortedTopBlocked = Companies.getTopBlocked();

      assert.ok(sortedTopBlocked.join(',') === sortedList.join(','), "top blocked returns correct sorted list");

  });
})();
