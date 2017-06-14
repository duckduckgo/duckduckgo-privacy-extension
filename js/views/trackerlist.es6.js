const Parent = window.DDG.base.View;
const animateBars = require('./mixins/animate-bars.es6.js');
const trackerListTemplate = require('./../templates/trackerlist.es6.js');

function TrackerList (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = trackerListTemplate;

    Parent.call(this, ops);

    this._cacheElems('.js-top-blocked', ['graph-bar-fg'])
    this.animateBars();
};

TrackerList.prototype = $.extend({},
    Parent.prototype,
    animateBars
);

module.exports = TrackerList;
