const Parent = window.DDG.base.View
const BreakageFormView = require('./../views/breakage-form.es6.js')
const breakageFormTemplate = require('./../templates/breakage-form.es6.js')

function BrokenSiteFooterView (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    // cache 'body' selector
    this.$body = window.$('body')

    // get data from background process, then re-render template with it
    this.model.getBackgroundTabData().then(() => {
        if (this.model.tab) {
            // render template for the first time here
            Parent.call(this, ops)
            this._setup()
        } else {
            // the timeout helps buffer the re-render cycle during heavy
            // page loads with lots of trackers
            Parent.call(this, ops)
            setTimeout(() => this.rerender(), 750)
        }
    })
}

BrokenSiteFooterView.prototype = window.$.extend({},
    Parent.prototype,
    {
        _openBreakageForm: function (e) {
            e.preventDefault()

            this.views.breakageForm = new BreakageFormView({
                siteView: this,
                template: breakageFormTemplate,
                model: this.model,
                appendTo: this.$body,
                clickSource: 'breakage-footer'
            })
        },

        _setup: function () {
            this.bindEvents([
                [this.$el, 'click', this._openBreakageForm]
            ])
        }
    }
)

module.exports = BrokenSiteFooterView
