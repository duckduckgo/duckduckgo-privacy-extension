const Parent = window.DDG.base.Page
const mixins = require('./mixins/index.es6.js')
const PrivacyOptionsView = require('./../views/privacy-options.es6.js')
const PrivacyOptionsModel = require('./../models/privacy-options.es6.js')
const privacyOptionsTemplate = require('./../templates/privacy-options.es6.js')
const AllowlistView = require('./../views/allowlist.es6.js')
const AllowlistModel = require('./../models/allowlist.es6.js')
const allowlistTemplate = require('./../templates/allowlist.es6.js')
const UserDataView = require('./../views/user-data.es6.js')
const UserDataModel = require('./../models/user-data.es6.js')
const userDataTemplate = require('./../templates/user-data.es6.js')
const browserUIWrapper = require('./../base/ui-wrapper.es6.js')
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

            this.views.allowlist = new AllowlistView({
                pageView: this,
                model: new AllowlistModel({}),
                appendTo: $parent,
                template: allowlistTemplate
            })
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
