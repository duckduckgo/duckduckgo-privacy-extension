/* global BUILD_TARGET */
const Parent = window.DDG.base.Page;
const mixins = require('./mixins/index.js');
const PrivacyOptionsView = require('./../views/privacy-options.js');
const PrivacyOptionsModel = require('./../models/privacy-options.js');
const privacyOptionsTemplate = require('./../templates/privacy-options.js');
const AllowlistView = require('./../views/allowlist.js');
const AllowlistModel = require('./../models/allowlist.js');
const allowlistTemplate = require('./../templates/allowlist.js');
const SiteGroupsView = require('./../views/site-groups.js');
const SiteGroupsModel = require('./../models/site-groups.js');
const siteGroupsTemplate = require('./../templates/site-groups.js');
const AllowedSitesView = require('./../views/allowed-sites.js');
const AllowedSitesModel = require('./../models/allowed-sites.js');
const allowedSitesTemplate = require('./../templates/allowed-sites.js');
const SanitizeYoutubeView = require('./../views/sanitize-youtube.js');
const SanitizeYoutubeModel = require('./../models/sanitize-youtube.js');
const sanitizeYoutubeTemplate = require('./../templates/sanitize-youtube.js');
const TimeAnalyticsView = require('./../views/time-analytics.js');
const TimeAnalyticsModel = require('./../models/time-analytics.js');
const timeAnalyticsTemplate = require('./../templates/time-analytics.js');
const BackgroundMessageModel = require('./../models/background-message.js');
const InternalOptionsView = require('./../views/internal-options.js').default;
const { sendMessage } = require('./../base/ui-wrapper.js');
const { getUserLocale, setStoredUiLocale, UI_LOCALES } = require('../../background/i18n.js');
const t = window.DDG.base.i18n.t;

function Options(ops) {
    Parent.call(this, ops);
}

Options.prototype = window.$.extend({}, Parent.prototype, mixins.setBrowserClassOnBodyTag, {
    pageName: 'options',

    ready: function () {
        const $siteGroupsParent = window.$('#blocked-sites-content');
        const $allowedSitesParent = window.$('#allowed-sites-content');
        const $blockTrackersParent = window.$('#block-trackers-content');
        const $sanitizeYoutubeParent = window.$('#sanitize-youtube-content');
        const $timeAnalyticsParent = window.$('#time-analytics-content');
        Parent.prototype.ready.call(this);

        this.setBrowserClassOnBodyTag();

        const textContainers = document.querySelectorAll('[data-text]');
        textContainers.forEach((el) => {
            const textID = el.getAttribute('data-text');
            const text = t(textID);
            el.innerHTML = text;
        });

        this._setupLanguageSwitcher();
        this._setupTabs();

        this.views.options = new PrivacyOptionsView({
            pageView: this,
            model: new PrivacyOptionsModel({}),
            appendTo: $blockTrackersParent,
            template: privacyOptionsTemplate,
        });

        this.views.allowlist = new AllowlistView({
            pageView: this,
            model: new AllowlistModel({}),
            appendTo: $blockTrackersParent,
            template: allowlistTemplate,
        });

        if (BUILD_TARGET === 'chrome') {
            this.views.siteGroups = new SiteGroupsView({
                pageView: this,
                model: new SiteGroupsModel({}),
                appendTo: $siteGroupsParent,
                template: siteGroupsTemplate,
            });

            this.views.allowedSites = new AllowedSitesView({
                pageView: this,
                model: new AllowedSitesModel({}),
                appendTo: $allowedSitesParent,
                template: allowedSitesTemplate,
            });
        }

        this.views.sanitizeYoutube = new SanitizeYoutubeView({
            pageView: this,
            model: new SanitizeYoutubeModel({}),
            appendTo: $sanitizeYoutubeParent,
            template: sanitizeYoutubeTemplate,
        });

        this.views.timeAnalytics = new TimeAnalyticsView({
            pageView: this,
            model: new TimeAnalyticsModel({}),
            appendTo: $timeAnalyticsParent,
            template: timeAnalyticsTemplate,
        });

        this.views.internal = new InternalOptionsView({
            pageView: this,
            appendTo: $blockTrackersParent,
        });

        this.message = new BackgroundMessageModel({});
    },

    _setupLanguageSwitcher: function () {
        const select = document.querySelector('.js-options-language');
        if (!select) {
            return;
        }

        const current = getUserLocale();
        const selected = UI_LOCALES.some((locale) => locale.code === current) ? current : 'en';
        const label = t('options:languageLabel.title');

        select.setAttribute('aria-label', label);
        for (const locale of UI_LOCALES) {
            const option = document.createElement('option');
            option.value = locale.code;
            option.textContent = locale.name;
            option.selected = locale.code === selected;
            select.appendChild(option);
        }

        select.addEventListener('change', () => {
            if (select.value === selected) {
                return;
            }
            setStoredUiLocale(select.value);
            sendMessage('updateSetting', { name: 'uiLocale', value: select.value });
            window.location.reload();
        });
    },

    _setupTabs: function () {
        this.$tabs = window.$('.js-options-tab');
        this.$panels = window.$('.js-options-panel');
        this.$tabs.on('click', this._onTabClick.bind(this));
        this.$tabs.on('keydown', this._onTabKeydown.bind(this));
        window.addEventListener('hashchange', this._onHashChange.bind(this));
        this._activateTab(this._tabFromLocation());
    },

    _tabFromLocation: function () {
        const tabName = window.location.hash.replace(/^#/, '');
        if (tabName && this.$tabs.filter(`[data-options-tab="${tabName}"]`).length) {
            return tabName;
        }
        return 'block-sites';
    },

    _onHashChange: function () {
        this._activateTab(this._tabFromLocation());
    },

    _activateTab: function (tabName, focusTab = false) {
        const $activeTab = this.$tabs.filter(`[data-options-tab="${tabName}"]`);
        if (!$activeTab.length) {
            return;
        }

        this.$tabs.each((_, tab) => {
            const $tab = window.$(tab);
            const isActive = $tab.attr('data-options-tab') === tabName;
            $tab.toggleClass('is-active', isActive);
            $tab.attr('aria-selected', String(isActive));
            $tab.attr('tabindex', isActive ? '0' : '-1');
        });

        this.$panels.each((_, panel) => {
            const $panel = window.$(panel);
            $panel.prop('hidden', $panel.attr('data-options-panel') !== tabName);
        });

        const url = new URL(window.location.href);
        if (url.hash !== `#${tabName}`) {
            url.hash = tabName;
            window.history.replaceState(null, '', url);
        }

        if (focusTab) {
            $activeTab.trigger('focus');
        }
    },

    _onTabClick: function (event) {
        this._activateTab(window.$(event.currentTarget).attr('data-options-tab'));
    },

    _onTabKeydown: function (event) {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
            return;
        }

        event.preventDefault();
        const tabs = this.$tabs.toArray();
        const currentIndex = tabs.indexOf(event.currentTarget);
        let nextIndex = currentIndex;

        if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;

        const $nextTab = window.$(tabs[nextIndex]);
        this._activateTab($nextTab.attr('data-options-tab'), true);
    },
});

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Options();
