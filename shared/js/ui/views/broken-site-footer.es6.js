const Parent = window.DDG.base.View
const browserUIWrapper = require('./../base/$BROWSER-ui-wrapper.es6.js')

function BrokenSiteFooterView (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

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

            browserUIWrapper.startBreakageFlow(this.model.tab.id)
            browserUIWrapper.closePopup()
        },

        _setup: function () {
            this.bindEvents([
                [this.$el, 'click', this._openBreakageForm]
            ])
        }
    }
)

module.exports = BrokenSiteFooterView
