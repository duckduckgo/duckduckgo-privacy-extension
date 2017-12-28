const ParentSlidingSubview = require('./sliding-subview.es6.js')

function GradeScorecard (ops) {
  this.model = ops.model
  this.template = ops.template

  ParentSlidingSubview.call(this, ops)

  this.setupClose()
}

GradeScorecard.prototype = window.$.extend({},
  ParentSlidingSubview.prototype,
  {
  }
)

module.exports = GradeScorecard
