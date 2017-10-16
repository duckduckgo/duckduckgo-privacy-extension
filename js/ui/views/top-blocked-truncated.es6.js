const Parent = window.DDG.base.View
const animateGraphBars = require('./mixins/animate-graph-bars.es6.js')
const TopBlockedFullView = require('./top-blocked.es6.js')
const topBlockedFullTemplate = require('./../templates/top-blocked.es6.js')

function TruncatedTopBlocked (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template
    Parent.call(this, ops)

    this.model.getTopBlocked().then(() => {
        this.rerenderList()
    })

    this.bindEvents([
        [this.model.store.subscribe, 'action:backgroundMessage', this.handleBackgroundMsg]
    ])
}

TruncatedTopBlocked.prototype = $.extend({},
    Parent.prototype,
    animateGraphBars,
    {

        _seeAllClick: function () {
            this.views.slidingSubview = new TopBlockedFullView({
                template: topBlockedFullTemplate,
                numItems: 10
            })
        },

        _setup: function () {
            this._cacheElems('.js-top-blocked', ['graph-bar-fg', 'pct', 'see-all'])
            this.bindEvents([
                [this.$seeall, 'click', this._seeAllClick]
            ]);
        },

        rerenderList: function () {
            this._rerender()
            this._setup()
            this.animateGraphBars()
        },

        handleBackgroundMsg: function (message) {
            if (!message || !message.action) return

            if (message.action === 'didResetTrackersData') {
                this.model.reset()
                this.rerenderList()
            }
        }
    }
);

module.exports = TruncatedTopBlocked
