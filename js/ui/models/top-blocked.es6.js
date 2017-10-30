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

TopBlocked.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'topBlocked',

      getTopBlocked: function () {
          return new Promise((resolve, reject) => {
              this.fetch({getTopBlockedByPages: this.numCompanies})
                  .then((data) => {
                      if (!data.totalPages || data.totalPages < 10) return resolve()
                      if (!data.topBlocked || data.topBlocked.length < 1) return resolve()
                      this.companyList = data.topBlocked
                      this.companyListMap = this.companyList.map((company) => {
                          return {
                            name: company.name,
                            percent: company.percent,
                            // calc graph bars using pixels instead of % to
                            // make margins easier
                            // max width: 145px
                            px: Math.floor(company.percent / 100 * 145)
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
      }

  }
)

module.exports = TopBlocked
