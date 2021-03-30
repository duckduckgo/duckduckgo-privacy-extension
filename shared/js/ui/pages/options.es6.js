const Parent = window.DDG.base.Page
const mixins = require('./mixins/index.es6.js')
const PrivacyOptionsView = require('./../views/privacy-options.es6.js')
const PrivacyOptionsModel = require('./../models/privacy-options.es6.js')
const privacyOptionsTemplate = require('./../templates/privacy-options.es6.js')
const WhitelistView = require('./../views/whitelist.es6.js')
const WhitelistModel = require('./../models/whitelist.es6.js')
const whitelistTemplate = require('./../templates/whitelist.es6.js')
const UserDataView = require('./../views/user-data.es6.js')
const UserDataModel = require('./../models/user-data.es6.js')
const userDataTemplate = require('./../templates/user-data.es6.js')
const BackgroundMessageModel = require('./../models/background-message.es6.js')
const browserUIWrapper = require('./../base/$BROWSER-ui-wrapper.es6.js')

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

            this.views.whitelist = new WhitelistView({
                pageView: this,
                model: new WhitelistModel({}),
                appendTo: $parent,
                template: whitelistTemplate
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
