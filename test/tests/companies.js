(function() {
  QUnit.module("Companies");

  QUnit.test("test companies and company classes", function (assert) {
      bkg.Companies.resetData();

      var company = bkg.Companies.add('Twitter');
      assert.ok(company.get('count') === 1, "has correct initial count");

      company.incrementCount();
      assert.ok(company.get('count') === 2, "increment count");

      bkg.Companies.resetData();

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

      // load a bunch of sites with known trackers. Check that the total number
      // of pages is correct and that we have the correct company percents. This 
      // could fail if a site has changed what company trackers it has. We'll just
      // look at google trackers to minimize that chance.

      const sites = ['https://lifehacker.com/', 'https://gizmodo.com/', 'https://www.theverge.com/']
      const totalPages = sites.length
      
      // clear company data
      bkg.Companies.resetData()

      var done = assert.async()
      var openTabs = 0
      // visit sites, wait to load, then close
      sites.forEach((site) => {
          chrome.tabs.create({url: site})
          openTabs++

          getLoadedTab(site).then((tab) => {
              // wait to let trackers load
              window.setTimeout(() => {
                  chrome.tabs.remove(tab.id)
                  openTabs--

                  if (!openTabs) {
                      let byPages = bkg.Companies.getTopBlockedByPages()
                      let googleEntry = byPages.topBlocked.find(e => e.name === 'Google');
                      assert.ok(googleEntry, 'Site has google tracker')
                      assert.ok(googleEntry.percent === 100, 'google is on 100% of test pages')
                      let pages = bkg.Companies.getTotalPages()
                      assert.ok(totalPages === pages, 'has correct number of total pages')
                      done()
                  }

              }, 1000)
          })
      })
  })
})();
