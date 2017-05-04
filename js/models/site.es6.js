const Parent = window.DDG.base.Model;

var backgroundPage = chrome.extension.getBackgroundPage();

function Site (attrs) {

    attrs.httpsIcon = 'orange';
    attrs.httpsStatusText = 'Forced Secure Connection';
    attrs.blockMessage = 'Trackers Blocked';

    Parent.call(this, attrs);
};


Site.prototype = $.extend({},
  Parent.prototype,
  {
      toggleWhitelist: function () {
          let site = this._getSite();
          if(site){
              site.toggleWhiteList();
              this.isWhitelisted = !this.isWhitelisted;
          }
      },

      setWhitelistStatus: function() {
          let site = this._getSite();
          if(site){
            this.isWhitelisted = site.isWhiteListed();
          }
      },

      _getSite: function() {
          let tab = backgroundPage.tabs[this.tabId];
          let host = backgroundPage.utils.extractHostFromURL(tab.url);
          let site = backgroundPage.Sites.get(host);
          return site;
      },

      updateTrackerCount: function() {
          let tab = backgroundPage.tabs[this.tabId];
          if(tab){
            this.trackerCount = tab.dispTotal;
          }
      }
  }
);


module.exports = Site;

