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

                      // bump "unknown" company trackers to end of array
                      const i = companyNames.indexOf('unknown');
                      if (i > -1) {
                          companyNames.splice(i, i+1);
                          companyNames.push('unknown');
                      }

                      // find company with largest number of trackers
                      let maxCount = 0;
                      if (self.trackersBlocked && companyNames.length > 0) {
                          companyNames.map((name) => {
                              // don't count "unknown" trackers since they will
                              // be listed individually at bottom of graph,
                              // we don't want "unknown" tracker total as maxCount
                              if (name !== 'unknown') {
                                  let compare = self.trackersBlocked[name].count;
                                  if (compare > maxCount) maxCount = compare;
                              }
                          });
                      }

                      // actual trackers we ended up blocking:
                      self.companyListMap = companyNames.map(
                          (companyName) => {
                              let company = self.trackersBlocked[companyName];
                              // calc max using pixels instead of % to make margins easier
                              // max width: 270 - (horizontal margin + padding in css) = 228
                              return {
                                  name: companyName,
                                  count: company.count,
                                  px: Math.floor(company.count * 228 / maxCount),
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
