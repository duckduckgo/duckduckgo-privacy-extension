const Parent = window.DDG.base.Model
const browserUIWrapper = require('./../base/$BROWSER-ui-wrapper.es6.js')

function UpdatedMessage (attrs) {
    Parent.call(this, attrs)
}

UpdatedMessage.prototype = window.$.extend({},
    Parent.prototype,
    {
        modelName: 'updatedMessage',

        openHelpPage: function () {
            browserUIWrapper.openHelpPage()
        },

        closeUpdateMessage: function () {
            browserUIWrapper.closeUpdateMessage()
        }
    }
)

module.exports = UpdatedMessage
