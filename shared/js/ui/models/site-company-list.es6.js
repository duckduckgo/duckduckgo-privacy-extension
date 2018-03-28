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

      // set trackerlist metadata for list display by company:
      this.companyListMap = companyNames
        .map((companyName) => {
          let company = this.trackers[companyName]
          let urlsList = company.urls ? Object.keys(company.urls) : []
          // calc max using pixels instead of % to make margins easier
          // max width: 300 - (horizontal padding in css) = 260
          return {
            name: companyName,
            count: this._setCount(company, companyName, urlsList),
            urls: company.urls,
            urlsList: urlsList
          }
        }, this)
        .sort((a, b) => {
          return b.count - a.count
        })

        console.log(this.companyListMap)
    },

    // Return true if company has unblocked trackers in the current tab
    hasUnblockedTrackers: function (company, urlsList) {
      if (!company || !company.urls || !urlsList) return false

      return urlsList.some((url) => company.urls[url].isBlocked === false)
    },

    // Determines sorting order of the company list
    _setCount: function (company, companyName, urlsList) {
      let count = company.count
      // Unknown trackers, followed by unblocked first party,
      // should be at the bottom of the list
      if (companyName === 'unknown') {
        count = -1
      } else if (this.hasUnblockedTrackers(company, urlsList)) {
        count = -2
      }

      return count
    }
  }
)

module.exports = SiteCompanyList
