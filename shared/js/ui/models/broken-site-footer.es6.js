const Parent = window.DDG.base.Model
const browserUIWrapper = require('./../base/$BROWSER-ui-wrapper.es6.js')

function BrokenSiteFooterModel (attrs) {
    attrs = attrs || {}
    attrs.tab = null
    Parent.call(this, attrs)
}

BrokenSiteFooterModel.prototype = window.$.extend({},
    Parent.prototype,
    {
        modelName: 'brokenSiteFooter',

        getBackgroundTabData: function () {
            return new Promise((resolve) => {
                browserUIWrapper.getBackgroundTabData().then((tab) => {
                    if (tab) {
                        this.set('tab', tab)
                    } else {
                        console.debug('Broken site footer model: no tab')
                    }

                    resolve()
                })
            })
        }
    }
)

module.exports = BrokenSiteFooterModel
