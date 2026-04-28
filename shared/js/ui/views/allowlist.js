const Parent = window.DDG.base.View;
const isHiddenClass = 'is-hidden';
const isDisabledClass = 'is-disabled';
const isInvalidInputClass = 'is-invalid-input';
const allowlistItemsTemplate = require('./../templates/allowlist-items.js');

function Allowlist(ops) {
    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    // bind events
    this.setup();
}

Allowlist.prototype = window.$.extend({}, Parent.prototype, {
    _removeItem: function (e) {
        const itemIndex = window.$(e.target).data('item');
        this.model.removeDomain(itemIndex);

        // No need to rerender the whole view
        this._renderList();
    },

    _addItem: function (e) {
        if (!this.$add.hasClass(isDisabledClass)) {
            const url = this.$url.val();
            let isValidInput = false;
            if (url) {
                isValidInput = this.model.addDomain(url);
            }

            if (isValidInput) {
                this.rerender();
            } else {
                this._showErrorMessage();
            }
        }
    },

    _showErrorMessage: function () {
        this._lastFocusedElement = document.activeElement;

        this.$add.addClass(isHiddenClass);
        this.$error.removeClass(isHiddenClass);
        this.$url.addClass(isInvalidInputClass);
        this.$url.attr('aria-invalid', 'true');
        this.$url.attr('aria-describedby', 'allowlist-error-text');

        // Hide all page content outside this allowlist section from screen readers
        this._backgroundElements = [];
        const allowlistSection = this.$error.closest('.options-content__allowlist')[0];
        const optionsContent = document.getElementById('options-content');
        if (optionsContent) {
            Array.from(optionsContent.children).forEach((el) => {
                if (el !== allowlistSection) {
                    el.setAttribute('aria-hidden', 'true');
                    el.setAttribute('inert', '');
                    this._backgroundElements.push(el);
                }
            });
        }
        // Also hide the page header/nav above #options-content
        const pageContainer = allowlistSection && allowlistSection.closest('.page-container');
        if (pageContainer) {
            Array.from(pageContainer.children).forEach((el) => {
                if (el !== optionsContent) {
                    el.setAttribute('aria-hidden', 'true');
                    el.setAttribute('inert', '');
                    this._backgroundElements.push(el);
                }
            });
        }

        // Move focus into the dialog
        const errorBody = this.$error.find('.modal-box__body')[0];
        if (errorBody) {
            errorBody.focus();
        }
    },

    _hideErrorMessage: function () {
        this.$add.removeClass(isHiddenClass);
        this.$error.addClass(isHiddenClass);
        this.$url.removeClass(isInvalidInputClass);
        this.$url.removeAttr('aria-invalid');
        this.$url.removeAttr('aria-describedby');

        // Restore background content visibility for screen readers
        if (this._backgroundElements) {
            this._backgroundElements.forEach((el) => {
                el.removeAttribute('aria-hidden');
                el.removeAttribute('inert');
            });
            this._backgroundElements = null;
        }

        // Return focus: prefer the URL input since the trigger button is now hidden
        if (this.$url && this.$url.length) {
            this.$url.focus();
        } else if (this._lastFocusedElement && document.contains(this._lastFocusedElement)) {
            this._lastFocusedElement.focus();
        }
        this._lastFocusedElement = null;
    },

    _manageInputChange: function (e) {
        const isButtonDisabled = this.$add.hasClass(isDisabledClass);

        this._hideErrorMessage();
        if (this.$url.val() && isButtonDisabled) {
            this.$add.removeClass(isDisabledClass);
        } else if (!this.$url.val()) {
            this.$add.addClass(isDisabledClass);
        }

        if (!isButtonDisabled && e.key === 'Enter') {
            // also add to allowlist on enter
            this._addItem();
        }
    },

    _showAddToAllowlistInput: function (e) {
        this.$url.removeClass(isHiddenClass);
        this.$url.focus();
        this.$add.removeClass(isHiddenClass);
        this.$showadd.addClass(isHiddenClass);
        e.preventDefault();
    },

    setup: function () {
        this._cacheElems('.js-allowlist', ['remove', 'add', 'error', 'show-add', 'container', 'list-item', 'url']);

        this.bindEvents([
            [this.$remove, 'click', this._removeItem],
            [this.$add, 'click', this._addItem],
            [this.$showadd, 'click', this._showAddToAllowlistInput],
            [this.$url, 'keyup', this._manageInputChange],
            // listen to changes to the allowlist model
            [this.store.subscribe, 'change:allowlist', this.rerender],
        ]);
    },

    rerender: function () {
        this.unbindEvents();
        this._rerender();
        this.setup();
    },

    _renderList: function () {
        this.unbindEvents();
        this.$container.html(allowlistItemsTemplate(this.model.list));
        this.setup();
    },
});

module.exports = Allowlist;
