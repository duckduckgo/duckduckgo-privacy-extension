const Parent = window.DDG.base.Model

function PrivacyOptions (attrs) {
    // set some default values for the toggle switches in the template
    attrs.httpsEverywhereEnabled = true
    attrs.embeddedTweetsEnabled = false
    attrs.GPC = false
    attrs.youtubePreviewsEnabled = false

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
                this.sendMessage('updateSetting', { name: k, value: this[k] })
            }
        },

        getSettings: function () {
            const self = this
            return new Promise((resolve, reject) => {
                self.sendMessage('getSetting', 'all').then((settings) => {
                    self.httpsEverywhereEnabled = settings.httpsEverywhereEnabled
                    self.embeddedTweetsEnabled = settings.embeddedTweetsEnabled
                    self.GPC = settings.GPC
                    self.youtubePreviewsEnabled = settings.youtubePreviewsEnabled

                    resolve()
                })
            })
        }
    }
)

module.exports = PrivacyOptions
