const Parent = window.DDG.base.View
const browserUIWrapper = require('./../base/ui-wrapper.es6.js')

function BreakageForm (ops) {
    this.model = ops.model
    this.template = ops.template
    this.siteView = ops.siteView
    this.clickSource = ops.clickSource
    this.$root = window.$('.js-breakage-form')
    Parent.call(this, ops)

    this._setup()
}

BreakageForm.prototype = window.$.extend({},
    Parent.prototype,
    {
        _setup: function () {
            this._cacheElems('.js-breakage-form', [
                'close',
                'submit',
                'element',
                'message',
                'dropdown',
                'off',
                'dismiss'
            ])
            this.bindEvents([
                [this.$close, 'click', this._closeForm],
                [this.$submit, 'click', this._submitForm],
                [this.$dropdown, 'change', this._selectCategory],
                [this.$off, 'click', this._disableProtections],
                [this.$dismiss, 'click', this._closeForm]
            ])
        },

        _closeForm: function (e) {
            if (e) e.preventDefault()
            // reload page after closing form if user got to form from
            // toggling privacy protection. otherwise destroy view.
            if (this.clickSource === 'toggle') {
                this.siteView.closePopupAndReload(500)
                this.destroy()
            } else {
                this.destroy()
            }
        },

        _submitForm: function () {
            if (this.$submit.hasClass('btn-disabled')) {
                return
            }

            const category = this.$dropdown.val()
            this.model.submitBreakageForm(category)
            this._showThankYouMessage()
        },

        _showThankYouMessage: function () {
            this.$element.addClass('is-transparent')
            this.$message.removeClass('is-transparent')
            // reload page after form submission if user got to form from
            // toggling privacy protection, otherwise destroy view.
            if (this.clickSource === 'toggle') {
                this.siteView.closePopupAndReload(3500)
            }
        },

        _selectCategory: function () {
        },

        _disableProtections: function(e) {
            if (e) e.preventDefault()

            this.model.toggleAllowlist()

            browserUIWrapper.startBreakageFlow(this.model.tab.id, () => {
                browserUIWrapper.closePopup()
            })
        }

    }
)

module.exports = BreakageForm
