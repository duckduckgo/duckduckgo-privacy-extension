const Parent = window.DDG.base.Page
const mixins = require('./mixins/index.es6.js')

function Feedback (ops) {
    Parent.call(this, ops)
}

Feedback.prototype = window.$.extend({},
    Parent.prototype,
    mixins.setBrowserClassOnBodyTag,
    {

        pageName: 'feedback',

        ready: function () {
            Parent.prototype.ready.call(this)
            this.setBrowserClassOnBodyTag()
        }
    }
)

// kickoff!
window.DDG = window.DDG || {}
window.DDG.page = new Feedback()
