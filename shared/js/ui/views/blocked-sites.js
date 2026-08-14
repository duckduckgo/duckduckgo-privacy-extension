const Parent = window.DDG.base.View;
const t = window.DDG.base.i18n.t;
const isHiddenClass = 'is-hidden';

function BlockedSites(ops) {
    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);
    this.setup();
}

BlockedSites.prototype = window.$.extend({}, Parent.prototype, {
    async _save() {
        this.$save.prop('disabled', true);
        this._hideMessages();

        try {
            const result = await this.model.save(this.$input.val());
            if (!result?.saved) {
                this.$error.text(
                    t('options:blockedSitesInvalid.title', {
                        entries: result?.invalidLines?.join(', ') || '',
                    }),
                );
                this.$error.removeClass(isHiddenClass);
                return;
            }

            this.$input.val(result.domains.join('\n'));
            this.$status.text(t('options:blockedSitesSaved.title'));
            this.$status.removeClass(isHiddenClass);
        } catch (error) {
            console.error('Failed to save blocked sites', error);
            this.$error.text(t('options:blockedSitesSaveError.title'));
            this.$error.removeClass(isHiddenClass);
        } finally {
            this.$save.prop('disabled', false);
        }
    },

    _hideMessages() {
        this.$status.addClass(isHiddenClass);
        this.$error.addClass(isHiddenClass);
    },

    _syncFromModel() {
        this.$input.val(this.model.domains.join('\n'));
    },

    setup() {
        this._cacheElems('.js-blocked-sites', ['input', 'save', 'status', 'error']);
        this.bindEvents([
            [this.$save, 'click', this._save],
            [this.$input, 'input', this._hideMessages],
            [this.store.subscribe, 'change:blockedSites', this._syncFromModel],
        ]);
    },
});

module.exports = BlockedSites;
