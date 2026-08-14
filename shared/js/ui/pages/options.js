/* global BUILD_TARGET */
const Parent = window.DDG.base.Page;
const mixins = require('./mixins/index.js');
const PrivacyOptionsView = require('./../views/privacy-options.js');
const PrivacyOptionsModel = require('./../models/privacy-options.js');
const privacyOptionsTemplate = require('./../templates/privacy-options.js');
const AllowlistView = require('./../views/allowlist.js');
const AllowlistModel = require('./../models/allowlist.js');
const allowlistTemplate = require('./../templates/allowlist.js');
const BlockedSitesView = require('./../views/blocked-sites.js');
const BlockedSitesModel = require('./../models/blocked-sites.js');
const blockedSitesTemplate = require('./../templates/blocked-sites.js');
const UserDataView = require('./../views/user-data.js');
const UserDataModel = require('./../models/user-data.js');
const userDataTemplate = require('./../templates/user-data.js');
const BackgroundMessageModel = require('./../models/background-message.js');
const browserUIWrapper = require('./../base/ui-wrapper.js');
const InternalOptionsView = require('./../views/internal-options.js').default;
const t = window.DDG.base.i18n.t;

function Options(ops) {
    Parent.call(this, ops);
}

Options.prototype = window.$.extend({}, Parent.prototype, mixins.setBrowserClassOnBodyTag, {
    pageName: 'options',

    ready: function () {
        const $blockedSitesParent = window.$('#blocked-sites-content');
        const $blockTrackersParent = window.$('#block-trackers-content');
        Parent.prototype.ready.call(this);

        this.setBrowserClassOnBodyTag();

        window.$('.js-feedback-link').click(this._onFeedbackClick.bind(this));
        window.$('.js-report-site-link').click(this._onReportSiteClick.bind(this));

        const textContainers = document.querySelectorAll('[data-text]');
        textContainers.forEach((el) => {
            const textID = el.getAttribute('data-text');
            const text = t(textID);
            el.innerHTML = text;
        });

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
            this.views.blockedSites = new BlockedSitesView({
                pageView: this,
                model: new BlockedSitesModel({}),
                appendTo: $blockedSitesParent,
                template: blockedSitesTemplate,
            });
        }

        this.views.userData = new UserDataView({
            pageView: this,
            model: new UserDataModel({}),
            appendTo: $blockTrackersParent,
            template: userDataTemplate,
        });

        this.views.internal = new InternalOptionsView({
            pageView: this,
            appendTo: $blockTrackersParent,
        });

        this.message = new BackgroundMessageModel({});
    },

    _setupTabs: function () {
        this.$tabs = window.$('.js-options-tab');
        this.$panels = window.$('.js-options-panel');
        this.$tabs.on('click', this._onTabClick.bind(this));
        this.$tabs.on('keydown', this._onTabKeydown.bind(this));
        this._activateTab('block-sites');
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

    _onFeedbackClick: function (e) {
        e.preventDefault();

        browserUIWrapper.openExtensionPage('/html/feedback.html');
    },

    _onReportSiteClick: function (e) {
        e.preventDefault();

        browserUIWrapper.openExtensionPage('/html/feedback.html?broken=1');
    },
});

// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Options();
