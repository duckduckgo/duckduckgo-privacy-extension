const Parent__SlidingSubview = require('./sliding-subview.es6.js');
const animateGraphBars = require('./mixins/animate-graph-bars.es6.js');
const PageTrackersModel = require('./../models/trackerlist-page.es6.js');
const AllTrackersModel = require('./../models/trackerlist-top-blocked.es6.js');

function TrackerList (ops) {

    this.selectedTab = ops.defaultTab;
    this.setModel();
    ops.model = this.model;
    this.template = ops.template;
    Parent__SlidingSubview.call(this, ops);

    this.$graphbarfg = this.$el.find('.js-top-blocked-graph-bar-fg');
    this.animateGraphBars();
};

TrackerList.prototype = $.extend({},
    Parent__SlidingSubview.prototype,
    animateGraphBars,
    {
        switchTabs: function () {
          // TODO: switch tabs
          // TODO: switch model
          // TODO: rerender list
        },

        setModel: function () {
            // so we always have freshest data
            if (this.selectedTab === 'all') {
                let num = 10;
                this.model = new AllTrackersModel({
                    modelName: 'trackerListTop' + num + 'Blocked',
                    numCompanies: 10
                })
            } else if (this.selectedTab === 'page') {
                this.model = new PageTrackersModel();
                this.model.fetchAsyncData().then(function() {
                      // TODO: pick up here tomorrow:
                      console.log('call renderList() <-- pick up here tmro');
                      this.renderList();
                });
            }
        },

        renderList: function () {
            console.log('RENDER LIST!!!!')
            console.log(this.model)
        }

    }
);

module.exports = TrackerList;
