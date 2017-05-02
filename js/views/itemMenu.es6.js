const Parent = window.DDG.base.View;

function ItemMenu (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new itemMenu view");

    // this._cacheElems('#js-item-menu', [ this.model.id ]);

    this.$linkableItem = $("#js-item-menu-" + this.model.id);

    // this.bindEvents() wires up jQuery selectors to events and their handlers:
    this.bindEvents([
      [this.$linkableItem, 'click', this._handleClick]
    ]);

};

ItemMenu.prototype = $.extend({},
    Parent.prototype,
    {

        _handleClick: function (e) {
            console.log('ItemMenu _handleClick()');

            this.model.link();
        }

    }

);

module.exports = ItemMenu;
