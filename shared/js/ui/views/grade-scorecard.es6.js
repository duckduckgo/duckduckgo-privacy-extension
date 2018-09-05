const Parent = require('./sliding-subview.es6.js')
const ratingHeroTemplate = require('../templates/shared/rating-hero.es6.js')
const gradesTemplate = require('../templates/shared/grade-scorecard-grades.es6.js')
const reasonsTemplate = require('../templates/shared/grade-scorecard-reasons.es6.js')

function GradeScorecard (ops) {
    this.model = ops.model
    this.template = ops.template

    Parent.call(this, ops)

    this._setup()

    this.bindEvents([[
        this.store.subscribe,
        `change:site`,
        this._onSiteChange
    ]])

    this.setupClose()
}

GradeScorecard.prototype = window.$.extend({},
    Parent.prototype,
    {
        _setup: function () {
            this._cacheElems('.js-grade-scorecard', [
                'reasons',
                'grades'
            ])
            this.$hero = this.$('.js-rating-hero')
        },

        _rerenderHero: function () {
            this.$hero.replaceWith(ratingHeroTemplate(
                this.model,
                { showClose: true }
            ))
        },

        _rerenderGrades: function () {
            this.$grades.replaceWith(gradesTemplate(this.model))
        },

        _rerenderReasons: function () {
            this.$reasons.replaceWith(reasonsTemplate(this.model))
        },

        _onSiteChange: function (e) {
            if (e.change.attribute === 'siteRating') {
                this._rerenderHero()
                this._rerenderGrades()
            }

            // all the other stuff we use in the reasons
            // (e.g. https, tosdr)
            // doesn't change dynamically
            if (e.change.attribute === 'trackerNetworks' ||
                    e.change.attribute === 'isaMajorTrackingNetwork') {
                this._rerenderReasons()
            }

            // recache any selectors that were rerendered
            this._setup()
            this.setupClose()
        }
    }
)

module.exports = GradeScorecard
