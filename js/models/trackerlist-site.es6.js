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
                      self.trackersBlocked = self.tab.trackers || {};
                      const companyNames = Object.keys(self.trackersBlocked);

                      // find company with largest number of trackers
                      // TODO: look into why self.tab.trackers[companyName].count is wrong
                      //       for now, we'll just use urls.length instead (!)
                      let maxCount = 0;
                      if (self.trackersBlocked && companyNames.length > 0) {
                          maxCount = self.trackersBlocked[companyNames[0]].urls.length;
                      }

                      // actual trackers we ended up blocking:
                      self.companyListMap = companyNames.map(
                          (companyName) => {
                              let company = self.trackersBlocked[companyName];
                              // calc max using pixels instead of % to make margins easier
                              // max width: 270 - (horizontal margin + padding in css) = 228
                              return {
                                  name: companyName,
                                  count: company.urls.length,
                                  px: Math.floor(company.urls.length * 228 / maxCount),
                                  urls: company.urls
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
