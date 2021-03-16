const bel = require('bel')
const Parent = window.DDG.base.Page
const mixins = require('../mixins/index.es6.js')
const BackgroundMessageModel = require('../../models/background-message.es6.js')
const EmailAliasView = require('../../views/email-alias.es6.js')
const EmailAliasModel = require('../../models/email-alias.es6.js')
const EmailAliasTemplate = require('../../templates/email-alias.es6.js')
const EmailAutofillMenuView = require('../../views/email-autofill-menu.es6.js')
const EmailAutofillMenuTemplate = require('../../templates/email-autofill-menu.es6.js')

function EmailAutofill (ops) {
    this.$parent = window.$('#popup-container')
    Parent.call(this, ops)
}

function EmailAliasTemplateWrapper () {
    if (this.model.userData && this.model.userData.nextAlias) {
        return EmailAliasTemplate.call(this)
    }

    return bel`
        <div>
            ${EmailAliasTemplate.call(this)}
            <div class="email-site-access">
                Site access:
                username <strong style="-webkit-user-select: all;">dax</strong>
                /
                password <strong style="-webkit-user-select: all;">qu4ckqu4ck!</strong>
            </div>
        </div>`
}

EmailAutofill.prototype = window.$.extend({},
    Parent.prototype,
    mixins.setBrowserClassOnBodyTag,
    {

        pageName: 'popup',

        ready: function () {
            Parent.prototype.ready.call(this)
            this.message = new BackgroundMessageModel()
            this.setBrowserClassOnBodyTag()
            const emailAliasModel = new EmailAliasModel()

            window.$('#email-autofill-menu').addClass('email-autofill-menu--enabled')

            this.views.emailAutofillMenu = new EmailAutofillMenuView({
                pageView: this,
                model: emailAliasModel,
                appendTo: window.$('#email-autofill-menu'),
                template: EmailAutofillMenuTemplate
            })

            this.views.emailAlias = new EmailAliasView({
                pageView: this,
                model: emailAliasModel,
                appendTo: window.$('#email-alias-container'),
                template: EmailAliasTemplateWrapper
            })
        }
    }
)

// kickoff!
window.DDG = window.DDG || {}
window.DDG.page = new EmailAutofill()
