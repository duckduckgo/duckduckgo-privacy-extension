const Parent = window.DDG.base.Model;

function Whitelist (attrs) {

    // TODO: utilize base.Model so we get nice set() method
    // pick up here tomorrow by setting model properly
    // so base view render() can do its thing with template fn
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
