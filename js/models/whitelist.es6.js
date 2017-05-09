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
            var domain = this.list[itemIndex];
            console.log(`whitelist: remove ${domain}`);

            // remove from UX. or we could do this.setWhitelistFromSettings
            // after we save the new whitelist
            // this.list.splice(itemIndex, 1);

            // TODO remove from actual whitelist
            var wlist = backgroundPage.settings.getSetting('whitelist') || {};

            if (wlist[domain]) { // it's got to exist right?
                delete wlist[domain];

                backgroundPage.settings.updateSetting('whitelist', wlist);
            }

            this.setWhitelistFromSettings();
        },

        setWhitelistFromSettings: function() {
            var wlist = backgroundPage.settings.getSetting('whitelist') || {};

            this.list = Object.keys(wlist);
        }


  }
);

module.exports = Whitelist;
