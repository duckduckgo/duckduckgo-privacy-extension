const Parent = window.DDG.base.Model;

const Whitelist = window.DDG.base.models.Whitelist = function (attrs) {

    // TODO: utilize base.Model so we get nice set() method
    debugger;
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
