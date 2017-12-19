const ParentSlidingSubview = require('./sliding-subview.es6.js')

function PrivacyPractices (ops) {
    this.template = ops.template
    ParentSlidingSubview.call(this, ops)

    this.setupClose();
}

PrivacyPractices.prototype = $.extend({},
    ParentSlidingSubview.prototype,
    {
        
    }
)

module.exports = PrivacyPractices
