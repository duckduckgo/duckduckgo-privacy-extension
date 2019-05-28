const Parent = window.DDG.base.View

function EnablePrompt (ops) {
    this.template = ops.template
    this.model = ops.model
    this.siteView = ops.siteView
    this.$body = window.$('body')

    Parent.call(this, ops)

    this._setup()
}

EnablePrompt.prototype = window.$.extend({},
    Parent.prototype,
    {
        _setup: function () {
            this._cacheElems('.js-enable-prompt', [
                'activate',
                'content',
                'success'
            ])

            this.bindEvents([
                [this.$activate, 'click', this._onActivateClick]
            ])

            this.$body.addClass('blocking-disabled')
            this.model.fetch({firePixel: 'epabi'})
        },

        _onActivateClick: function () {
            this.model.fetch({updateSetting: {name: 'trackerBlockingEnabled', value: true}})
            this.model.fetch({firePixel: 'epabc'})
            this._showSuccessState()
        },

        _showSuccessState: function () {
            this.$content.addClass('is-transparent')
            this.$success.removeClass('is-transparent')
            this.siteView.closePopupAndReload(1500)
        }
    }
)

module.exports = EnablePrompt
