const Parent = window.DDG.base.View
const GradeDetailsView = require('./../views/grade-details.es6.js')
const gradeDetailsTemplate = require('./../templates/grade-details.es6.js')

function Site (ops) {

    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    Parent.call(this, ops)

    this.$body = $('body')

    // bind events
    this._setup()

    // get data from background page tab
    this.model.getBackgroundTabData().then(() => this.rerender())
};

Site.prototype = $.extend({},
    Parent.prototype,
    {

        _setup: function() {

            this._cacheElems('.js-site', [
                'toggle',
                'show-all-trackers'
            ]);

            this.bindEvents([
                [this.$toggle, 'click', this._whitelistClick],
                [this.$showalltrackers, 'click', this._showAllTrackers],
                [this.store.subscribe, 'change:site', this.rerender]
            ])

        },

        _whitelistClick: function (e) {
            this.model.toggleWhitelist()
            console.log('isWhitelisted: ', this.model.isWhitelisted)
            chrome.tabs.reload(this.model.tab.id)
            const w = chrome.extension.getViews({type: 'popup'})[0]
            w.close()
        },

        rerender: function () {
            // console.log('[view] rerender()')
            if (this.model.disabled) {
                this.$body.addClass('disabled')
            } else {
                this.$body.removeClass('disabled');
                this.unbindEvents()
                this._rerender()
                this._setup()
            }
        },

        _showAllTrackers: function () {
            if (this.$body.hasClass('disabled')) return
            this.views.slidingSubview = new GradeDetailsView({
                template: gradeDetailsTemplate
            })
        }

    }

)

module.exports = Site
