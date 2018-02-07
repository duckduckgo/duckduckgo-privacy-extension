const Parent = window.DDG.base.Model

function TopBlocked (attrs) {
  attrs = attrs || {}
  attrs.numCompanies = attrs.numCompanies
  attrs.companyList = []
  attrs.companyListMap = []
  attrs.pctPagesWithTrackers = null
  attrs.lastStatsResetDate = null
  Parent.call(this, attrs)
}

TopBlocked.prototype = window.$.extend({},
  Parent.prototype,
  {

    modelName: 'topBlocked',

    getTopBlocked: function () {
      return new Promise((resolve, reject) => {
        this.fetch({getTopBlockedByPages: this.numCompanies})
          .then((data) => {
            // TODO remove this before merging - added for testing
            this.addTestData()
            return resolve()

            if (!data.totalPages || data.totalPages < 30) return resolve()
            if (!data.topBlocked || data.topBlocked.length < 1) return resolve()
            this.companyList = data.topBlocked
            this.companyListMap = this.companyList.map((company) => {
              return {
                name: company.name,
                percent: company.percent
              }
            })
            if (data.pctPagesWithTrackers) {
              this.pctPagesWithTrackers = data.pctPagesWithTrackers

              if (data.lastStatsResetDate) {
                this.lastStatsResetDate = data.lastStatsResetDate
              }
            }
            resolve()
          })
      })
    },

    reset: function (resetDate) {
      this.companyList = []
      this.companyListMap = []
      this.pctPagesWithTrackers = null
      this.lastStatsResetDate = resetDate
    },

    addTestData: function () {
      this.companyListMap = [
        { name: "Google", percent: 95 },
        { name: "Facebook", percent: 60 },
        { name: "comScore", percent: 50 },
        { name: "Nielsen", percent: 40 },
        { name: "Krux", percent: 33 },
        { name: "AdSafe", percent: 33 },
        { name: "Chartbeat", percent: 20 },
        { name: "Amazon", percent: 10 },
        { name: "Quantcast", percent: 5 },
        { name: "Amazon.com", percent: 1 }
      ]
      this.companyListMap = this.companyListMap.slice(0, this.numCompanies)
      this.pctPagesWithTrackers = 88
      this.lastStatsResetDate = Date.now()
    }
  }
)

module.exports = TopBlocked
