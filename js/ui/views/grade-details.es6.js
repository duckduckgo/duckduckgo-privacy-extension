const ParentSlidingSubview = require('./sliding-subview.es6.js')
const CompanyListModel = require('./../models/company-list.es6.js')
const SiteModel = require('./../models/site.es6.js')

function GradeDetails (ops) {

    // model data is async
    this.model = null
    this.currentModelName = null
    this.currentSiteModelName = null

    this.template = ops.template
    ParentSlidingSubview.call(this, ops)

    this.setupClose()
    this.renderAsyncContent()
}

GradeDetails.prototype = $.extend({},
    ParentSlidingSubview.prototype,
    {

        renderAsyncContent: function () {
            const random = Math.round(Math.random()*100000)
            this.currentModelName = 'companyList' + random
            this.currentSiteModelName = 'site' + random

            this.model = new CompanyListModel({
                modelName: this.currentModelName
            })
            this.model.fetchAsyncData().then(() => {
                this.model.site = new SiteModel({
                    modelName: this.currentSiteModelName
                })
                this.model.site.getBackgroundTabData().then(() => {
                    let content = this.template()
                    this.$el.append(content)

                    // TODO: wrap a setTimeout around this so it doesn't
                    // re-render too often
                    // if (this.model.site) {
                    //     this.bindEvents([[
                    //         this.store.subscribe,
                    //         `change:${this.currentSiteModelName}`,
                    //         this.renderAsyncContent
                    //     ]])
                    // }

                })
            })
        }
    }
)

module.exports = GradeDetails
