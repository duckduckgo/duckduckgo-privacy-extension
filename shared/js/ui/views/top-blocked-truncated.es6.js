const Parent = window.DDG.base.View
const TopBlockedFullView = require('./top-blocked.es6.js')
const topBlockedFullTemplate = require('./../templates/top-blocked.es6.js')

function TruncatedTopBlocked (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    this.model.getTopBlocked().then(() => {
        Parent.call(this, ops)
        this._setup()
    })

    this.bindEvents([
        [this.model.store.subscribe, 'action:backgroundMessage', this.handleBackgroundMsg]
    ])
}

TruncatedTopBlocked.prototype = window.$.extend({},
    Parent.prototype,
    {

        _seeAllClick: function () {
            this.model.fetch({ firePixel: 'eps' })
            this.views.slidingSubview = new TopBlockedFullView({
                template: topBlockedFullTemplate,
                numItems: 10
            })
        },

        _setup: function () {
            this._cacheElems('.js-top-blocked', ['graph-bar-fg', 'pct', 'see-all'])
            this.bindEvents([
                [this.$seeall, 'click', this._seeAllClick]
            ])
        },

        rerenderList: function () {
            this._rerender()
            this._setup()
        },

        handleBackgroundMsg: function (message) {
            if (!message || !message.action) return

            if (message.action === 'didResetTrackersData') {
                this.model.reset()
                setTimeout(() => this.rerenderList(), 750)
                this.rerenderList()
            }
        }
    }
)

module.exports = TruncatedTopBlocked
