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
    `change:${this.model.modelName}`,
    this._onScoreCardChange
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
        this.model.site,
        { showClose: true }
      ))
    },

    _rerenderGrades: function () {
      this.$grades.replaceWith(gradesTemplate(
        this.model.grades
      ))
    },

    _rerenderReasons: function () {
      this.$grades.replaceWith(reasonsTemplate(
        this.model.reasons
      ))
    },

    _onScoreCardChange: function (e) {
      if (e.change.attribute === 'grades') {
        this._rerenderHero()
        this._rerenderGrades()
      }

      if (e.change.attribute === 'ratings') {
        this._rerenderReasons()
      }

      // recache any selectors that were rerendered
      this._setup()
      this.setupClose()
    }
  }
)

module.exports = GradeScorecard
