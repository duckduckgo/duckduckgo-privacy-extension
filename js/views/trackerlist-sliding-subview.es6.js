const Parent__SlidingSubview = require('./sliding-subview.es6.js');
const animateGraphBars = require('./mixins/animate-graph-bars.es6.js');

function TrackerList (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent__SlidingSubview.call(this, ops);

    this._cacheElems('.js-top-blocked', ['graph-bar-fg'])

    this.animateGraphBars();
};

TrackerList.prototype = $.extend({},
    Parent__SlidingSubview.prototype,
    animateGraphBars
);

module.exports = TrackerList;
