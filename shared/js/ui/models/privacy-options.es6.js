const Parent = window.DDG.base.Model

function PrivacyOptions (attrs) {
    // set some default values for the toggle switches in the template
    attrs.trackerBlockingEnabled = true
    attrs.httpsEverywhereEnabled = true
    attrs.embeddedTweetsEnabled = false
    attrs.GPC = false

    Parent.call(this, attrs)
}

PrivacyOptions.prototype = window.$.extend({},
    Parent.prototype,
    {

        modelName: 'privacyOptions',

        toggle: function (k) {
            if (Object.hasOwnProperty.call(this, k)) {
                this[k] = !this[k]
                console.log(`PrivacyOptions model toggle ${k} is now ${this[k]}`)
                this.fetch({ updateSetting: { name: k, value: this[k] } })
            }
        },

        getSettings: function () {
            const self = this
            return new Promise((resolve, reject) => {
                self.fetch({ getSetting: 'all' }).then((settings) => {
                    self.trackerBlockingEnabled = settings.trackerBlockingEnabled
                    self.httpsEverywhereEnabled = settings.httpsEverywhereEnabled
                    self.embeddedTweetsEnabled = settings.embeddedTweetsEnabled
                    self.GPC = settings.GPC

                    resolve()
                })
            })
        }
    }
)

module.exports = PrivacyOptions
