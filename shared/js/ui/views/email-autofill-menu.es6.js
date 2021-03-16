const Parent = window.DDG.base.View

function EmailAutofillMenuView (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    Parent.call(this, ops)
    this._setup()
}

EmailAutofillMenuView.prototype = window.$.extend({},
    Parent.prototype,
    {
        _logout: function (e) {
            e.preventDefault()
            this.model.logout()
        },

        _setup: function () {
            this._cacheElems('.js-email-autofill-menu', ['logout'])

            this.bindEvents([
                [this.$logout, 'click', this._logout],
                [this.store.subscribe, 'change:emailAlias', this.rerender]
            ])
        },

        rerender: function () {
            // Try and re-render all associated views, to work around store
            // subscriptions being limited to only a single listener. Each view
            // may not be ready to be rerendered, so swallow any errors.
            Object.keys(this.pageView.views).forEach((viewName) => {
                const view = this.pageView.views[viewName]
                try {
                    view.unbindEvents()
                    view._rerender()
                    view._setup()
                } catch (e) {}
            })
        }
    }
)

module.exports = EmailAutofillMenuView
