const Parent = window.DDG.base.View;
const t = window.DDG.base.i18n.t;
const { formatRemainingLong, hoursMinutesToSeconds } = require('../../shared-utils/site-groups');

const isHiddenClass = 'is-hidden';

function randomTwoDigit() {
    return 10 + Math.floor(Math.random() * 90);
}

function createRemovalChallenge() {
    const a = randomTwoDigit();
    const b = randomTwoDigit();
    return { a, b, answer: a + b };
}

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
        let lockChanged = false;
        this.$el.find('.js-site-group').each((_, card) => {
            const group = groupsById.get(card.getAttribute('data-group-id'));
            if (!group) {
                return;
            }
            if (Boolean(group.settingsLocked) !== card.classList.contains('is-locked')) {
                lockChanged = true;
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
        if (lockChanged) {
            this._updatingTimersOnly = false;
            this._rerenderPreservingFocus();
        }
    },

    _rerenderPreservingFocus() {
        this._hideRemoveDialog();
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
        if (input && !input.disabled) {
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
        if (event.target.classList?.contains('js-site-group-remove-dialog')) {
            this._hideRemoveDialog();
            return;
        }
        if (!target.length) {
            return;
        }
        if (target.hasClass('js-site-groups-add')) {
            this._createGroup();
            return;
        }
        if (target.hasClass('js-site-group-remove-cancel')) {
            this._hideRemoveDialog();
            return;
        }
        if (target.hasClass('js-site-group-remove-submit')) {
            this._confirmRemoveDomain();
            return;
        }
        const $card = this._card(event);
        if (!$card.length) {
            return;
        }
        if (target.hasClass('js-site-group-add-domain')) {
            this._addDomain($card);
            return;
        }
        if ($card.hasClass('is-locked')) {
            return;
        }
        if (target.hasClass('js-site-group-save')) {
            this._saveGroup($card);
        } else if (target.hasClass('js-site-group-delete')) {
            this._deleteGroup($card);
        } else if (target.hasClass('js-site-group-remove-domain')) {
            this._showRemoveDialog($card.attr('data-group-id'), target.attr('data-domain'));
        }
    },

    _onKeydown(event) {
        if (event.key === 'Escape' && this._pendingRemove) {
            event.preventDefault();
            this._hideRemoveDialog();
            return;
        }
        if (event.key === 'Enter' && this._pendingRemove && window.$(event.target).hasClass('js-site-group-remove-answer')) {
            event.preventDefault();
            this._confirmRemoveDomain();
            return;
        }
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
            if (result?.locked) {
                this._showError($next, t('options:groupLockedError.title'));
                return;
            }
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
        this._updatingTimersOnly = false;
        const id = $card.attr('data-group-id');
        const domain = $card.find('.js-site-group-domain-input').val();
        try {
            const result = await this.model.addDomain(id, domain);
            const $next = this.$el.find(`.js-site-group[data-group-id="${id}"]`);
            if (result?.locked) {
                this._showError($next, t('options:groupLockedError.title'));
                return;
            }
            if (result?.invalid || !result?.saved) {
                this._showError($next, t('options:invalidWebsite.title'));
            }
        } catch (error) {
            console.error('Failed to add website', error);
            const $next = this.$el.find(`.js-site-group[data-group-id="${id}"]`);
            this._showError($next, t('options:groupSaveError.title'));
        }
    },

    async _removeDomain(groupId, domain) {
        this._updatingTimersOnly = false;
        await this.model.removeDomain(groupId, domain);
    },

    _showRemoveDialog(groupId, domain) {
        if (!groupId || !domain) {
            return;
        }
        this._pendingRemove = { groupId, domain, challenge: createRemovalChallenge() };
        const $dialog = this.$el.find('.js-site-group-remove-dialog');
        $dialog.find('.js-site-group-remove-dialog-text').text(t('options:removeWebsiteConfirm.title', { domain }));
        $dialog.find('.js-site-group-remove-math').text(
            t('options:removeWebsiteMath.title', {
                a: this._pendingRemove.challenge.a,
                b: this._pendingRemove.challenge.b,
            }),
        );
        $dialog.find('.js-site-group-remove-error').addClass(isHiddenClass).text('');
        $dialog.find('.js-site-group-remove-answer').val('');
        $dialog.removeClass(isHiddenClass);
        $dialog.find('.js-site-group-remove-answer').trigger('focus');
    },

    _hideRemoveDialog() {
        this._pendingRemove = null;
        this.$el.find('.js-site-group-remove-dialog').addClass(isHiddenClass);
    },

    async _confirmRemoveDomain() {
        const pending = this._pendingRemove;
        if (!pending?.groupId || !pending.domain || !pending.challenge) {
            return;
        }
        const $dialog = this.$el.find('.js-site-group-remove-dialog');
        const guess = Number($dialog.find('.js-site-group-remove-answer').val());
        if (!Number.isInteger(guess) || guess !== pending.challenge.answer) {
            pending.challenge = createRemovalChallenge();
            $dialog.find('.js-site-group-remove-math').text(
                t('options:removeWebsiteMath.title', {
                    a: pending.challenge.a,
                    b: pending.challenge.b,
                }),
            );
            $dialog.find('.js-site-group-remove-error').text(t('options:removeWebsiteMathWrong.title')).removeClass(isHiddenClass);
            $dialog.find('.js-site-group-remove-answer').val('').trigger('focus');
            return;
        }
        this._hideRemoveDialog();
        await this._removeDomain(pending.groupId, pending.domain);
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
