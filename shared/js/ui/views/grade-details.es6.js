const ParentSlidingSubview = require('./sliding-subview.es6.js')
const CompanyListModel = require('./../models/site-company-list.es6.js')
const SiteModel = require('./../models/site.es6.js')
const ratingTemplate = require('./../templates/shared/site-rating.es6.js')
const ratingExplainerTemplate = require('./../templates/shared/site-rating-explainer.es6.js')

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

        setup: function () {
            // site rating arrives async
            this.bindEvents([[
                this.store.subscribe,
                `change:${this.model.modelName}`,
                this.renderSiteRating
            ]])
            this.$rating = this.$el.find('.js-rating')
            this.$explainer = this.$el.find('.js-rating-explainer')
        },

        renderAsyncContent: function () {
            this.model = new CompanyListModel({
                uniqueModelName: true
            })
            this.model.fetchAsyncData().then(() => {
                this.model.site = new SiteModel({
                    uniqueModelName: true
                })
                this.model.site.getBackgroundTabData().then(() => {
                    let content = this.template()
                    this.$el.append(content)
                    this.setup()
                })
            })
        },

        renderSiteRating: function () {
            // rating bubble
            const rating = ratingTemplate(
                this.model.site.isCalculating,
                this.model.site.siteRating,
                this.model.site.isWhitelisted
            )
            this.$rating.replaceWith(rating)
            // rating explainer message
            const msg = ratingExplainerTemplate(
                this.model.site.isCalculating,
                this.model.site.siteRating,
                this.model.site.isWhitelisted)
            this.$explainer.replaceWith(msg)
        }
    }
)

module.exports = GradeDetails
