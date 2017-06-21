const Parent = window.DDG.base.Model;
const backgroundPage = chrome.extension.getBackgroundPage();

function TrackerListCurrentPage (attrs) {

    attrs = attrs || {};
    attrs.tab = null;
    attrs.potentialBlocked = [];
    attrs.companyListMap = [];
    Parent.call(this, attrs);
};


TrackerListCurrentPage.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'trackerListCurrentPage',

      fetchAsyncData: function () {
          const self = this;

          return new Promise ((resolve, reject) => {
              backgroundPage.utils.getCurrentTab(function(rawTab) {
                  if (rawTab) {
                      self.tab = backgroundPage.tabManager.get({'tabId': rawTab.id});
                      self.potentialBlocked = Object.keys(self.tab.potentialBlocked);
                      const companies = Object.keys(self.tab.trackers);

                      // actual trackers we ended up blocking:
                      self.companyListMap = companies.map(
                          (company) => {
                              return {
                                  name: company,
                                  count: self.tab.trackers[company].count,
                                  urls: self.tab.trackers[company].urls
                              }
                          });
                  } else {
                      console.debug('TrackerListCurrentPage model: no tab');
                  }

                  resolve();
              });
          });
      }
  }
);


module.exports = TrackerListCurrentPage;

