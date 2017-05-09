const Parent = window.DDG.base.View;

function Whitelist (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new Whitelist");

    this._cacheElems('.js-whitelist', [ 'item' ]);

    this.bindEvents([
      [this.$item, 'click', this._handleClick]
    ]);

};

Whitelist.prototype = $.extend({},
    Parent.prototype,
    {

        _handleClick: function (e) {
            console.log(`whitelist _handleClick()`);
        }

    }

);

module.exports = Whitelist;
