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

      setHttpsMessage: function() {
          let tabHttpsRules = backgroundPage.activeRulesets.getRulesets(this.tabId);
          let tab = backgroundPage.tabs[this.tabId];
          let secureMessage = "Secure Connection";
          let unSecureMessage = "Unsecure Connection";
          let secureMessageHttps = "Secure Connection-HTTPS";

          if(tabHttpsRules){
              for(var ruleUrl in tabHttpsRules){
                  if(this._hasMainFrameHttpsRule(ruleUrl, tabHttpsRules[ruleUrl], tab.url)){
                      this.httpsStatusText = secureMessageHttps;
                      return;
                  }
              }
          }
          else if(/^https/.exec(tab.url)){
              this.httpsStatusText = secureMessage;
              return;
          }

          // fall through to unsecure message
          this.httpsStatusText = unSecureMessage;
      },

      _hasMainFrameHttpsRule: function(ruleUrl, siteRules, tabUrl){
          if(this._isMainFrameURL(ruleUrl, tabUrl)){
            for(var rule in siteRules.rules){
                if(siteRules.rules[rule].to === "https:"){
                    return true;
                }
            }
          }
      },

      _isMainFrameURL(urlToCheck, mainFrameUrl){
          let host = backgroundPage.utils.extractHostFromURL(mainFrameUrl);
          let re = new RegExp(host, "gi");
          if(re.exec(urlToCheck)){
              return true;
          }
          return false;
      }
  }
);


module.exports = Site;

