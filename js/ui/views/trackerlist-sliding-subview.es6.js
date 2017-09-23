const Parent__SlidingSubview = require('./sliding-subview.es6.js');
const animateGraphBars = require('./mixins/animate-graph-bars.es6.js');
const SiteTrackersModel = require('./../models/trackerlist-site.es6.js');
const AllTrackersModel = require('./../models/trackerlist-top-blocked.es6.js');

function TrackerList (ops) {

    this.selectedTab = ops.defaultTab; // poss values: `page` or `all`
    ops.model = null;
    this.template = ops.template;
    Parent__SlidingSubview.call(this, ops);
    this.updateList();

    this.setActiveTab();
    this.$navtab = this.$el.find('.js-nav-tab');
    this.$reset = this.$el.find('.js-reset-trackers-data');

    this.bindEvents([
        [this.$navtab, 'click', this.switchTabs],
        [this.$reset, 'click', this.resetTrackersStats]
    ]);

    // animate graph bars
    this.$graphbarfg = this.$el.find('.js-top-blocked-graph-bar-fg');
    this.animateGraphBars();
};

TrackerList.prototype = $.extend({},
    Parent__SlidingSubview.prototype,
    animateGraphBars,
    {

        setActiveTab: function () {
            let selector = '.js-nav-tab';
            this.$el.find(selector).removeClass('active');
            selector = selector + '-' + this.selectedTab;
            this.$el.find(selector).addClass('active');
        },

        switchTabs: function (e) {
            e.preventDefault();
            let selector = '.js-nav-tab-' + this.selectedTab;
            let $elHasClass = $(e.currentTarget).hasClass;

            if (this.selectedTab === 'all') {
                if (!$(e.currentTarget).hasClass(selector)) {
                    this.selectedTab = 'page';
                    this.updateList();
                    this.setActiveTab();
                }
            } else if (this.selectedTab === 'page') {
                if (!$(e.currentTarget).hasClass(selector)) {
                    this.selectedTab = 'all';
                    this.updateList();
                    this.setActiveTab();
                }
            }

        },

        updateList: function () {
            if (this.selectedTab === 'all') {
                let num = 10;
                this.model = new AllTrackersModel({
                    modelName: 'trackerListTop' + num + 'Blocked' + Math.round(Math.random()*100000),
                    numCompanies: 10
                });
                this.model.getTopBlocked().then(() => {
                    this.renderList()
                });

            } else if (this.selectedTab === 'page') {
                this.model = new SiteTrackersModel({
                    modelName: 'siteTrackerList-' + Math.round(Math.random()*100000)
                });
                this.model.fetchAsyncData().then(() => {
                    this.renderList()
                });
            }
        },

        renderList: function () {
            this.$el.find('.js-top-blocked-list').remove();
            let ol = this.template.call(this);
            this.$el.append(ol);
            this.$graphbarfg = this.$el.find('.js-top-blocked-graph-bar-fg');
            this.animateGraphBars();
        },

        resetTrackersStats: function () {
            this.model.fetch({resetTrackersData: true}).then(() =>{
                console.log('TODO: pick up here on Monday, re-render lists')
            })
        }
    }
);

module.exports = TrackerList;
