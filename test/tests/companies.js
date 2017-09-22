(function() {
  QUnit.module("Companies");
  
  QUnit.test("test companies and company classes", function (assert) {
      bkg.Companies.clearData();
      
      var company = bkg.Companies.add('Twitter');
      assert.ok(company.get('count') === 1, "has correct initial count");

      company.incrementCount();
      assert.ok(company.get('count') === 2, "increment count");
      
      bkg.Companies.clearData();

      var sortedData = {
          "Facebook": 10,
          "MSN": 8,
          "Reddit": 2
      };

      var sortedList = ["Facebook", "MSN", "Reddit"];

      sortedList.forEach(function(c){
          var newCompany = bkg.Companies.add(c);
          newCompany.set('count', sortedData[c]);
      });

      var sortedTopBlocked = [];
      bkg.Companies.getTopBlocked().forEach((c) => {
          sortedTopBlocked.push(c.name);
      });

      assert.ok(sortedTopBlocked.join(',') === sortedList.join(','), "top blocked returns correct sorted list");

  });
})();
