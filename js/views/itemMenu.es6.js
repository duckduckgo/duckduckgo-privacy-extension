const Parent = window.DDG.base.View;

function ItemMenu (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.$linkableItem = $('#js-linkable-' + this.model.id);

    this.bindEvents([
      [this.$linkableItem, 'click', this._handleClick]
    ]);

};

ItemMenu.prototype = $.extend({},
    Parent.prototype,
    {

        _handleClick: function (e) {
            this.model.link();
        }

    }

);

module.exports = ItemMenu;
