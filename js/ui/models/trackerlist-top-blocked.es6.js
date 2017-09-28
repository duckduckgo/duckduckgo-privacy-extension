const Parent = window.DDG.base.Model

function TrackerListTopBlocked (attrs) {
    this.numCompanies = attrs.numCompanies
    this.companyList = []
    this.companyListMap = []
    Parent.call(this, attrs)
}

TrackerListTopBlocked.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'trackerListTopBlocked',

      getTopBlocked: function () {
          return new Promise((resolve, reject) => {
              this.fetch({getTopBlockedByPages: this.numCompanies})
                  .then((data) => {
                      // only show top blocked chart after 10 pages visited
                      if (!data.totalPages || data.totalPages < 10) return resolve()
                      if (!data.topBlocked || data.topBlocked.length < 1) return resolve()
                      this.companyList = data.topBlocked
                      this.companyListMap = this.companyList.map((company) => {
                          return {
                            name: company.name,
                            percent: company.percent,
                            // calc graph bars using pixels instead of % to
                            // make margins easier
                            // max width: 160px
                            px: Math.floor(company.percent / 100 * 160)
                          }
                      })
                      resolve()
                })
          })
      }
  }
)

module.exports = TrackerListTopBlocked
