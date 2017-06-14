const Parent = window.DDG.base.View;

function TrackerList (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    window.setTimeout(this._animateBlockerBars.bind(this), 250);
};

TrackerList.prototype = $.extend({},
    Parent.prototype,
    {

        _animateBlockerBars: () => {
            $('.js-top-blocked-bar-fg').each((i, el) => {
                let $el = $(el);
                let w = $el.data().width;
                $el.css('width', w);
            })
        }

    }

);

module.exports = TrackerList;
