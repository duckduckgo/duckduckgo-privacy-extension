const Parent = window.DDG.base.View

function PrivacyOptions (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    Parent.call(this, ops)

    this.model.getSettings().then(() => {
        this.rerender()
    })
}

PrivacyOptions.prototype = window.$.extend({},
    Parent.prototype,
    {

        _clickSetting: function (e) {
            var key = window.$(e.target).data('key') || window.$(e.target).parent().data('key')
            console.log(`privacyOptions view click for setting "${key}"`)
            this.model.toggle(key)
            this.rerender()
        },

        setup: function () {
            this._cacheElems('.js-options', ['blocktrackers', 'https-everywhere-enabled', 'embedded-tweets-enabled', 'gpc-enabled'])
            this.bindEvents([
                [this.$blocktrackers, 'click', this._clickSetting],
                [this.$httpseverywhereenabled, 'click', this._clickSetting],
                [this.$embeddedtweetsenabled, 'click', this._clickSetting],
                [this.$gpcenabled, 'click', this._clickSetting]
            ])
        },

        rerender: function () {
            this.unbindEvents()
            this._rerender()
            this.setup()
        }
    }
)

module.exports = PrivacyOptions
