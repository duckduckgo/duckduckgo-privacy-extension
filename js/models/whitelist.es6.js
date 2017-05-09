const Parent = window.DDG.base.Model;

var backgroundPage = chrome.extension.getBackgroundPage();

function Whitelist (attrs) {

    var wlist = backgroundPage.settings.getSetting('whitelist') || {};

    attrs.list = Object.keys(wlist);
    
    Parent.call(this, attrs);


};


Whitelist.prototype = $.extend({},
  Parent.prototype,
  {

      getList: function () {
      }

  }
);

module.exports = Whitelist;
