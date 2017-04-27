const Parent = window.DDG.base.View;

function Whitelist (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    // this._cacheElems('.js-whitelist', [
    //   'foo',
    //   'bar'
    // ]);

    // this.bindEvents([
    //   [this.$foo, 'click', this._handleClick]
    // ]);

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
