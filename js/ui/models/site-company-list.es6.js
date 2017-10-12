const Parent = window.DDG.base.Model

function SiteCompanyList (attrs) {
    attrs = attrs || {}
    attrs.tab = null
    attrs.companyListMap = []
    Parent.call(this, attrs)
}

SiteCompanyList.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'siteCompanyList',

      fetchAsyncData: function () {
          return new Promise ((resolve, reject) => {
              this.fetch({getCurrentTab: true}).then((tab) => {
                  if (tab) {
                      this.fetch({getTab: tab.id}).then((bkgTab) => {
                        this.tab = bkgTab;
                        this._updateCompaniesList()
                        resolve()
                      })
                  } else {
                      console.debug('SiteDetails model: no tab');
                      resolve()
                  }
              })
          })
      },

      _updateCompaniesList: function () {
          // list of all trackers on page (whether we blocked them or not)
          this.trackers = this.tab.trackers || {}
          const companyNames = Object.keys(this.trackers)

          // find largest number of trackers (by company)
          let maxCount = 0;
          if (this.trackers && companyNames.length > 0) {
              companyNames.map((name) => {
                  // don't sort "unknown" trackers since they will
                  // be listed individually at bottom of graph,
                  // we don't want "unknown" tracker total as maxCount
                  if (name !== 'unknown') {
                      let compare = this.trackers[name].count
                      if (compare > maxCount) maxCount = compare;
                  }
              })
          }

          // set trackerlist metadata for list display by company:
          this.companyListMap = companyNames
              .map((companyName) => {
                  let company = this.trackers[companyName];
                  // calc max using pixels instead of % to make margins easier
                  // max width: 300 - (horizontal padding in css) = 260
                  return {
                      name: companyName,
                      count: companyName === 'unknown' ? 1 : company.count,
                      px: Math.floor(company.count * 260 / maxCount),
                      urls: company.urls
                  }
              })
              .sort((a, b) => {
                  return b.count - a.count;
              })
      }
  }
)

module.exports = SiteCompanyList
