const Parent = window.DDG.base.View
const GradeDetailsView = require('./../views/grade-details.es6.js')
const gradeDetailsTemplate = require('./../templates/grade-details.es6.js')

function Site (ops) {

    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    // render template for the first time here
    // in default `this.model.isCalculatingSiteRating` state
    Parent.call(this, ops)

    // cache 'body' selector
    this.$body = $('body')

    // get data from background process, then re-render template with it
    this.model.getBackgroundTabData().then(() => {
        if (this.model.tab &&
           (this.model.tab.status === 'complete' || this.model.domain === 'new tab')) {
            this.rerender()
        } else {
            // the timeout helps buffer the re-render cycle during heavy
            // page loads with lots of trackers
            setTimeout(() => this.rerender(), 750)
        }
    })
}

Site.prototype = $.extend({},
    Parent.prototype,
    {

        _whitelistClick: function (e) {
            if (this.$body.hasClass('is-disabled')) return
            this.model.toggleWhitelist()
            console.log('isWhitelisted: ', this.model.isWhitelisted)
            chrome.tabs.reload(this.model.tab.id)
            const w = chrome.extension.getViews({type: 'popup'})[0]
            w.close()
        },

        rerender: function () {
            // console.log('[site view] rerender()')
            if (this.model && this.model.disabled) {
                console.log('.addClass is-disabled')
                this.$body.addClass('is-disabled')
                this._rerender()
                this._setup()
            } else {
                this.$body.removeClass('is-disabled');
                this.unbindEvents()
                this._rerender()
                this._setup()
            }
        },

        // NOTE: ._setup() is not called until after first this.rerender() call!
        // after ._setup() is called this view listens for changes to
        // site model and re-renders every time
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

        _showAllTrackers: function () {
            if (this.$body.hasClass('is-disabled')) return
            this.views.slidingSubview = new GradeDetailsView({
                template: gradeDetailsTemplate
            })
        }

    }

)

module.exports = Site
