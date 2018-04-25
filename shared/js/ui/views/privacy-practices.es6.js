const ParentSlidingSubview = require('./sliding-subview.es6.js')

function PrivacyPractices (ops) {
    this.model = ops.model
    this.template = ops.template

    ParentSlidingSubview.call(this, ops)

    this.setupClose()
}

PrivacyPractices.prototype = window.$.extend({},
    ParentSlidingSubview.prototype,
    {
    }
)

module.exports = PrivacyPractices
