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
                  .then((list) => {
                      this.companyList = list
                      this.companyListMap = this.companyList.map((company) => {
                          return {
                            name: company.name,
                            percent: company.percent,
                            // calc graph bars using pixels instead of % to
                            // make margins easier
                            // max width: 300 - (horizontal css padding) = 260
                            px: Math.floor(company.percent / 100 * 260)
                          }
                      })
                      resolve()
                })
          })
      }
  }
)

module.exports = TrackerListTopBlocked
