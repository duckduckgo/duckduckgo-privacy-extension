const Parent = window.DDG.base.Model;

var backgroundPage = chrome.extension.getBackgroundPage();

function Whitelist (attrs) {

    this.setWhitelistFromSettings();

    Parent.call(this, attrs);
};


Whitelist.prototype = $.extend({},
  Parent.prototype,
  {

        removeDomain(itemIndex) {
            console.log(`whitelist: remove ${this.list[itemIndex]}`);
            this.list.splice(itemIndex, 1);

            // TODO remove from actual whitelist
            //
            // this.setWhitelistFromSettings();
        },

        setWhitelistFromSettings: function() {
            var wlist = backgroundPage.settings.getSetting('whitelist') || {};

            this.list = Object.keys(wlist);
        }


  }
);

module.exports = Whitelist;
