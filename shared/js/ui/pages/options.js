const Parent = window.DDG.base.Page
const mixins = require('./mixins/index.js')
const PrivacyOptionsView = require('./../views/privacy-options.js')
const PrivacyOptionsModel = require('./../models/privacy-options.js')
const privacyOptionsTemplate = require('./../templates/privacy-options.js')
const AllowlistView = require('./../views/allowlist.js')
const AllowlistModel = require('./../models/allowlist.js')
const allowlistTemplate = require('./../templates/allowlist.js')
const UserDataView = require('./../views/user-data.js')
const UserDataModel = require('./../models/user-data.js')
const userDataTemplate = require('./../templates/user-data.js')
const BackgroundMessageModel = require('./../models/background-message.js')
const browserUIWrapper = require('./../base/ui-wrapper.js')
const InternalOptionsView = require('./../views/internal-options.js').default
const t = window.DDG.base.i18n.t

function Options (ops) {
    Parent.call(this, ops)
}

Options.prototype = window.$.extend({},
    Parent.prototype,
    mixins.setBrowserClassOnBodyTag,
    {

        pageName: 'options',

        ready: function () {
            const $parent = window.$('#options-content')
            Parent.prototype.ready.call(this)

            this.setBrowserClassOnBodyTag()

            window.$('.js-feedback-link')
                .click(this._onFeedbackClick.bind(this))
            window.$('.js-report-site-link')
                .click(this._onReportSiteClick.bind(this))

            const textContainers = document.querySelectorAll('[data-text]')
            textContainers.forEach(el => {
                const textID = el.getAttribute('data-text')
                const text = t(textID)
                el.innerHTML = text
            })

            this.views.options = new PrivacyOptionsView({
                pageView: this,
                model: new PrivacyOptionsModel({}),
                appendTo: $parent,
                template: privacyOptionsTemplate
            })

            this.views.userData = new UserDataView({
                pageView: this,
                model: new UserDataModel({}),
                appendTo: $parent,
                template: userDataTemplate
            })

            this.views.internal = new InternalOptionsView({
                pageView: this,
                appendTo: $parent
            })

            this.views.allowlist = new AllowlistView({
                pageView: this,
                model: new AllowlistModel({}),
                appendTo: $parent,
                template: allowlistTemplate
            })

            this.message = new BackgroundMessageModel({})
        },

        _onFeedbackClick: function (e) {
            e.preventDefault()

            browserUIWrapper.openExtensionPage('/html/feedback.html')
        },

        _onReportSiteClick: function (e) {
            e.preventDefault()

            browserUIWrapper.openExtensionPage('/html/feedback.html?broken=1')
        }
    }
)

// kickoff!
window.DDG = window.DDG || {}
window.DDG.page = new Options()
