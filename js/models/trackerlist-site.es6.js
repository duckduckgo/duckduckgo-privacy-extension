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

                      // list of all trackers on page (whether we blocked them or not)
                      self.trackers = self.tab.trackers || {};
                      const companyNames = Object.keys(self.trackers);

                      // find largest number of trackers (by company)
                      let maxCount = 0;
                      if (self.trackers && companyNames.length > 0) {
                          companyNames.map((name) => {
                              // don't count "unknown" trackers since they will
                              // be listed individually at bottom of graph,
                              // we don't want "unknown" tracker total as maxCount
                              if (name !== 'unknown') {
                                  // let compare = self.trackersBlocked[name].count;
                                  let compare = self.trackers[name].count;
                                  if (compare > maxCount) maxCount = compare;
                              }
                          });
                      }

                      // set trackerlist metadata for list display by company:
                      self.companyListMap = companyNames.map(
                          (companyName) => {
                              let company = self.trackers[companyName];
                              // calc max using pixels instead of % to make margins easier
                              // max width: 270 - (horizontal margin + padding in css) = 228
                              return {
                                  name: companyName,
                                  count: companyName === 'unknown' ? 0 : company.count,
                                  px: Math.floor(company.count * 228 / maxCount),
                                  urls: company.urls
                              }
                          })
                          .sort((a, b) => {
                              return b.count - a.count;
                          })

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
