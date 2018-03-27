const DOMAIN_MAPPINGS = require('./../../../data/tracker_lists/trackersWithParentCompany.json').TopTrackerDomains
const Parent = window.DDG.base.Model

function SiteCompanyList (attrs) {
  attrs = attrs || {}
  attrs.tab = null
  attrs.companyListMap = []
  attrs.DOMAIN_MAPPINGS = DOMAIN_MAPPINGS
  Parent.call(this, attrs)
}

SiteCompanyList.prototype = window.$.extend({},
  Parent.prototype,
  {

    modelName: 'siteCompanyList',

    fetchAsyncData: function () {
      return new Promise((resolve, reject) => {
        this.fetch({getCurrentTab: true}).then((tab) => {
          if (tab) {
            this.fetch({getTab: tab.id}).then((bkgTab) => {
              this.tab = bkgTab
              this._updateCompaniesList()
              resolve()
            })
          } else {
            console.debug('SiteDetails model: no tab')
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
      let maxCount = 0
      if (this.trackers && companyNames.length > 0) {
        companyNames.map((name) => {
          // don't sort "unknown" nor unblocked trackers since they will
          // be listed individually at bottom of graph,
          // we don't want "unknown" tracker total as maxCount
          if (name !== 'unknown' || 
            this.hasUnblockedTrackers(this.trackers[name])) {
            let compare = this.trackers[name].count
            if (compare > maxCount) maxCount = compare
          }
        })
      }

      // set trackerlist metadata for list display by company:
      this.companyListMap = companyNames
        .map((companyName) => {
          let company = this.trackers[companyName]
          // calc max using pixels instead of % to make margins easier
          // max width: 300 - (horizontal padding in css) = 260
          return {
            name: companyName,
            count: this._setCount(company),
            px: Math.floor(company.count * 260 / maxCount),
            urls: company.urls
          }
        }, this)
        .sort((a, b) => {
          return b.count - a.count
        })
    },

    // Return true if company has unblocked trackers in the current tab
    hasUnblockedTrackers: function (company) {
      if (!company || !company.urls) return false

      const urls = Object.keys(company.urls)
      return urls.some((url) => url.isBlocked === false)
    },

    // Determines sorting order of the company list
    _setCount: function (company) {
      let count = company.count
      // Unknown trackers, followed by unblocked first party,
      // should be at the bottom of the list
      if (company.name === 'unknown') {
        count = -1
      } else if (this.hasUnblockedTrackers(company)) {
        count = -2
      }

      return count
    }
  }
)

module.exports = SiteCompanyList
