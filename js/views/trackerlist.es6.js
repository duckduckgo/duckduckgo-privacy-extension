const Parent = window.DDG.base.View;
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
    {

        animateBars: function () {
            let self = this;

            window.setTimeout(function () {
                if (!self.$graphbarfg) return;
                self.$graphbarfg.each(function (i, el) {
                    let $el = $(el);
                    let w = $el.data().width;
                    $el.css('width', w);
                });

            }, 250);

        }

    }

);

module.exports = TrackerList;
