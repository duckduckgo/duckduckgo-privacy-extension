const Parent = window.DDG.base.Model;

function ItemMenu (attrs) {


    Parent.call(this, attrs);

};


ItemMenu.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'itemMenu'

  }
);


module.exports = ItemMenu;

