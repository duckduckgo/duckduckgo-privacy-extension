const Parent = window.DDG.base.Model;
const backgroundPage = chrome.extension.getBackgroundPage();

function SiteTrackerList (attrs) {

    attrs = attrs || {};
    attrs.tab = null;
    attrs.potentialBlocked = [];
    attrs.companyListMap = [];
    Parent.call(this, attrs);
};


SiteTrackerList.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'siteTrackerList',

      fetchAsyncData: function () {
          const self = this;

          return new Promise ((resolve, reject) => {
              backgroundPage.utils.getCurrentTab((rawTab) => {
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
                      console.debug('SiteTrackerList model: no tab');
                  }

                  resolve();
              });
          });
      }
  }
);


module.exports = SiteTrackerList;
