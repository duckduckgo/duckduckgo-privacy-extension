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
      toggleWhitelist: function (s) {
          this.isWhitelisted = !this.isWhitelisted;
          let tab = backgroundPage.tabs[this.tabId];
          let host = backgroundPage.utils.extractHostFromURL(tab.url);
          let site = backgroundPage.Sites.get(host);
          
          if(site){
              site.toggleWhiteList();
          }
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

