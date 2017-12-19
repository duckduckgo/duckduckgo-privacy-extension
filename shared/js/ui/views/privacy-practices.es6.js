const ParentSlidingSubview = require('./sliding-subview.es6.js')
const SiteModel = require('./../models/site.es6.js')
const overviewTemplate = require('./../templates/shared/privacy-practices-overview.es6.js')
const detailsTemplate = require('./../templates/shared/privacy-practices-details.es6.js')

function PrivacyPractices (ops) {
    this.model = null
    this.currentModelName = null
    this.template = ops.template

    ParentSlidingSubview.call(this, ops)

    this._cacheElems('.js-privacy-practices', [
        'overview',
        'details',
    ])

    this.setupClose();
    this.renderAsyncContent();
}

PrivacyPractices.prototype = $.extend({},
    ParentSlidingSubview.prototype,
    {
        renderAsyncContent: function () {
            const random = Math.round(Math.random()*100000)
            this.currentModelName = 'site' + random

            this.model = new SiteModel({
                modelName: this.currentModelName
            })

            this.model.getBackgroundTabData().then(() => {
                this.$overview.html(overviewTemplate(
                    this.model.domain,
                    this.model.tosdr
                ))
                this.$details.html(detailsTemplate(this.model.tosdr))
            })
        }
    }
)

module.exports = PrivacyPractices
