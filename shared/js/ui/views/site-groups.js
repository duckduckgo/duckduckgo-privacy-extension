const Parent = window.DDG.base.View;
const t = window.DDG.base.i18n.t;
const { formatRemainingLong, hoursMinutesToSeconds } = require('../../shared-utils/site-groups');

const isHiddenClass = 'is-hidden';

function SiteGroups(ops) {
    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);
    this.setup();
}

SiteGroups.prototype = window.$.extend({}, Parent.prototype, {
    setup() {
        this.bindEvents([
            [this.$el, 'click', this._onClick],
            [this.$el, 'keydown', this._onKeydown],
            [this.store.subscribe, 'change:siteGroups', this._onModelChange],
        ]);
        this._startTimer();
    },

    destroy() {
        this._stopTimer();
        Parent.prototype.destroy.call(this);
    },

    _startTimer() {
        this._stopTimer();
        this._timer = window.setInterval(() => this._tick(), 1000);
    },

    _stopTimer() {
        if (this._timer) {
            window.clearInterval(this._timer);
            this._timer = null;
        }
    },

    async _tick() {
        this._updatingTimersOnly = true;
        try {
            await this.model.load();
        } catch (error) {
            console.warn('Failed to refresh group timers', error);
        } finally {
            this._updatingTimersOnly = false;
        }
    },

    _onModelChange() {
        if (this._updatingTimersOnly) {
            this._updateTimers();
            return;
        }
        this._rerenderPreservingFocus();
    },

    _updateTimers() {
        const groupsById = new Map((this.model.groups || []).map((group) => [group.id, group]));
        this.$el.find('.js-site-group').each((_, card) => {
            const group = groupsById.get(card.getAttribute('data-group-id'));
            if (!group) {
                return;
            }
            const remaining = card.querySelector('.js-site-group-remaining');
            const timer = card.querySelector('.js-site-group-timer');
            if (remaining) {
                remaining.textContent = formatRemainingLong(group.remainingSeconds);
            }
            if (timer) {
                const progress = group.maxSecondsPerDay
                    ? Math.max(0, Math.min(100, (group.remainingSeconds / group.maxSecondsPerDay) * 100))
                    : 0;
                timer.style.setProperty('--progress', String(progress));
            }
        });
    },

    _rerenderPreservingFocus() {
        const active = document.activeElement;
        const card = active?.closest?.('.js-site-group');
        const groupId = card?.getAttribute('data-group-id');
        const field = active?.className || '';
        const value = active && 'value' in active ? active.value : null;

        this.unbindEvents();
        this._rerender();
        this.setup();

        if (!groupId) {
            return;
        }
        const nextCard = this.$el.find(`.js-site-group[data-group-id="${groupId}"]`);
        const selector = field.includes('js-site-group-name')
            ? '.js-site-group-name'
            : field.includes('js-site-group-hours')
              ? '.js-site-group-hours'
              : field.includes('js-site-group-minutes')
                ? '.js-site-group-minutes'
                : field.includes('js-site-group-domain-input')
                  ? '.js-site-group-domain-input'
                  : null;
        if (!selector) {
            return;
        }
        const input = nextCard.find(selector).get(0);
        if (input) {
            if (value != null) {
                input.value = value;
            }
            input.focus();
            if (typeof input.setSelectionRange === 'function' && typeof input.value === 'string') {
                const end = input.value.length;
                input.setSelectionRange(end, end);
            }
        }
    },

    _card(event) {
        return window.$(event.target).closest('.js-site-group');
    },

    _onClick(event) {
        const target = window.$(event.target).closest('button');
        if (!target.length) {
            return;
        }
        if (target.hasClass('js-site-groups-add')) {
            this._createGroup();
            return;
        }
        const $card = this._card(event);
        if (!$card.length) {
            return;
        }
        if (target.hasClass('js-site-group-save')) {
            this._saveGroup($card);
        } else if (target.hasClass('js-site-group-delete')) {
            this._deleteGroup($card);
        } else if (target.hasClass('js-site-group-add-domain')) {
            this._addDomain($card);
        } else if (target.hasClass('js-site-group-remove-domain')) {
            this._removeDomain($card, target.attr('data-domain'));
        }
    },

    _onKeydown(event) {
        if (event.key !== 'Enter') {
            return;
        }
        const $card = this._card(event);
        if (!$card.length) {
            return;
        }
        if (window.$(event.target).hasClass('js-site-group-domain-input')) {
            event.preventDefault();
            this._addDomain($card);
        }
    },

    async _createGroup() {
        this._updatingTimersOnly = false;
        await this.model.create();
    },

    async _saveGroup($card) {
        this._hideMessages($card);
        const id = $card.attr('data-group-id');
        const name = $card.find('.js-site-group-name').val();
        const maxSecondsPerDay = hoursMinutesToSeconds(
            $card.find('.js-site-group-hours').val(),
            $card.find('.js-site-group-minutes').val(),
        );
        try {
            const result = await this.model.updateGroup(id, { name, maxSecondsPerDay });
            const $next = this.$el.find(`.js-site-group[data-group-id="${id}"]`);
            if (!result?.saved) {
                this._showError($next, t('options:groupSaveError.title'));
                return;
            }
            this._showStatus($next, t('options:groupSaved.title'));
        } catch (error) {
            console.error('Failed to save group', error);
            const $next = this.$el.find(`.js-site-group[data-group-id="${id}"]`);
            this._showError($next, t('options:groupSaveError.title'));
        }
    },

    async _deleteGroup($card) {
        const id = $card.attr('data-group-id');
        this._updatingTimersOnly = false;
        await this.model.deleteGroup(id);
    },

    async _addDomain($card) {
        this._hideMessages($card);
        const id = $card.attr('data-group-id');
        const domain = $card.find('.js-site-group-domain-input').val();
        try {
            const result = await this.model.addDomain(id, domain);
            const $next = this.$el.find(`.js-site-group[data-group-id="${id}"]`);
            if (result?.invalid || !result?.saved) {
                this._showError($next, t('options:invalidWebsite.title'));
            }
        } catch (error) {
            console.error('Failed to add website', error);
            const $next = this.$el.find(`.js-site-group[data-group-id="${id}"]`);
            this._showError($next, t('options:groupSaveError.title'));
        }
    },

    async _removeDomain($card, domain) {
        await this.model.removeDomain($card.attr('data-group-id'), domain);
    },

    _showStatus($card, message) {
        $card.find('.js-site-group-status').text(message).removeClass(isHiddenClass);
    },

    _showError($card, message) {
        $card.find('.js-site-group-error').text(message).removeClass(isHiddenClass);
    },

    _hideMessages($card) {
        $card.find('.js-site-group-status, .js-site-group-error').addClass(isHiddenClass);
    },
});

module.exports = SiteGroups;
