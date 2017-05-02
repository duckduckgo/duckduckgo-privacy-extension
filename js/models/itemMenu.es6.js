const Parent = window.DDG.base.Model;

function ItemMenu (attrs) {


    Parent.call(this, attrs);

};


ItemMenu.prototype = $.extend({},
  Parent.prototype,
  {
      // f: function (s) {
      //     console.log(`ItemMenu f()`);
      // }

  }
);


module.exports = ItemMenu;

