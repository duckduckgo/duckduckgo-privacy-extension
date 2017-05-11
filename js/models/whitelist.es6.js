const Parent = window.DDG.base.Model;

var backgroundPage = chrome.extension.getBackgroundPage();

function Whitelist (attrs) {

    this.setWhitelistFromSettings();

    Parent.call(this, attrs);
};


Whitelist.prototype = $.extend({},
  Parent.prototype,
  {

        modelName: 'whitelist',


        removeDomain(itemIndex) {
            var domain = this.list[itemIndex];
            console.log(`whitelist: remove ${domain}`);

            var site = backgroundPage.Sites.get(domain);

            if (site) {
                site.setWhitelisted(false);
            }

            this.setWhitelistFromSettings();
        },

        setWhitelistFromSettings: function() {
            var wlist = backgroundPage.settings.getSetting('whitelist') || {};

            this.list = Object.keys(wlist);
            this.list.sort();
        }

  }
);

module.exports = Whitelist;
