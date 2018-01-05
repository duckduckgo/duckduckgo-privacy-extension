const Parent = require('./sliding-subview.es6.js')

function GradeScorecard (ops) {
  this.model = ops.model
  this.template = ops.template

  Parent.call(this, ops)

  this.bindEvents([[
    this.store.subscribe,
    `change:${this.model.modelName}`,
    this._rerender
  ]])

  this.setupClose()
}

GradeScorecard.prototype = window.$.extend({},
  Parent.prototype,
  {
  }
)

module.exports = GradeScorecard
