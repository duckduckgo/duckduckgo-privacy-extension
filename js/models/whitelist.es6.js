const Parent = window.DDG.base.Model;

function Whitelist (attrs) {

    Parent.call(this, attrs);


};


Whitelist.prototype = $.extend({},
  Parent.prototype,
  {

      getList: function () {
          // retrieve list from local storage
      }

  }
);

module.exports = Whitelist;
