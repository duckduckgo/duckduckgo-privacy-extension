const Parent = window.DDG.base.View;
const Parent__SlidingSubview = require('./sliding-subview.es6.js');
const animateBars = require('./mixins/animate-bars.es6.js');

function TrackerList (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    if (ops.isSlidingSubview) {
        Parent__SlidingSubview.call(this, ops);
    } else {
        Parent.call(this, ops);
    }

    this._cacheElems('.js-top-blocked', ['graph-bar-fg'])
    this.animateBars();
};

TrackerList.prototype = $.extend({},
    Parent.prototype,
    animateBars
);

module.exports = TrackerList;
