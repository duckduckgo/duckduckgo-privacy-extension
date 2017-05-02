const Parent = window.DDG.base.View;

function Whitelist (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new Whitelist");

    // this._cacheElems() caches jQuery selectors, so the following would be
    // accessible via: `this.$item` from within this view
    // and is equivalent to $('.js-whitelist-item')
    this._cacheElems('.js-whitelist', [
      'item'
    ]);

    // this.bindEvents() wires up jQuery selectors to events and their handlers:
    this.bindEvents([
      [this.$item, 'click', this._handleClick]
    ]);

};

Whitelist.prototype = $.extend({},
    Parent.prototype,
    {

        _handleClick: function (e) {
            console.log(`_handleClick()`);
        }

    }

);

module.exports = Whitelist;
