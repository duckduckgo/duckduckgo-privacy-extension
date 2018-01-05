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
}

GradeScorecard.prototype = window.$.extend({},
  Parent.prototype,
  {
    _render: function (ops) {
      Parent.prototype._render.call(this, ops)

      this.setupClose()
    }
  }
)

module.exports = GradeScorecard
