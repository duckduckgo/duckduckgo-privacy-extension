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
          console.log(`Site toggleWhitelist()`);
      },

      updateTrackerCount: function() {
          let tab = backgroundPage.tabs[this.tabId];
          if(tab){
            this.trackerCount = tab.dispTotal;
          }
      },

      isHTTPS: function() {
          let tabHttpsRules = backgroundPage.activeRulesets.getRulesets(this.tabId);
          let tab = backgroundPage.tabs[this.tabId];
          let secureMessage = "Secure Connection";
          let unSecureMessage = "Unsecure Connection";
          
          if(/^https/.exec(tab.url)){
              this.httpsStatusText = secureMessage;
              return;
          }
          else if(tabHttpsRules && tabHttpsRules.length){
              for(siteRules in tabHttpsRules){
                  if(_hasMainFrameHttpsRule){
                      this.httpsStatusText = secureMessage;
                      return;
                  }
              }
          }
          else {
              this.httpsStatusText = unSecureMessage;
          }
          
      },

      _hasMainFrameHttpsRule: function(siteRules, tab){
          for(rule in siteRules.rules){
              if(rules.to === "https"){
                  return true;
              }
          }
      }
  }
);


module.exports = Site;

