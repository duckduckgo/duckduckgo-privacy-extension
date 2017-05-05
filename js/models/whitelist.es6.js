const Parent = window.DDG.base.Model;

function Whitelist (attrs) {

    Parent.call(this, attrs);


};


Whitelist.prototype = $.extend({},
  Parent.prototype,
  {

      modelType: 'whitelist',

      getList: function () {
          // retrieve list from local storage
      }

  }
);

module.exports = Whitelist;
