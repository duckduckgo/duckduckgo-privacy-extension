const Parent = window.DDG.base.Model;

var backgroundPage = chrome.extension.getBackgroundPage();

// TODO move to settings?
const httpsStates = {
        'default':  'Secure Connection',
        'upgraded': 'Forced Secure Connection',
        'none':     'Insecure Connection'
    };

function Site (attrs) {
    
    // test FIXME get from httpseverywhere
    attrs.httpsState = 'none';

    // set message and icon based on httpsState
    attrs.httpsStatusText = httpsStates[attrs.httpsState];

    Parent.call(this, attrs);
};


Site.prototype = $.extend({},
  Parent.prototype,
  {
      toggleWhitelist: function (s) {
          console.log('Site toggleWhitelist() not implemented');
          this.isWhitelisted = !this.isWhitelisted;

          // TODO actually update whitelist
      },

      updateTrackerCount: function() {
          let tab = backgroundPage.tabs[this.tabId];
          if(tab){
            this.trackerCount = tab.dispTotal;
          }
      },

      setHttpsMessage: function() {
          let tab = backgroundPage.tabs[this.tabId];
          let hostname = "www." + backgroundPage.utils.extractHostFromURL(tab.url);
          let httpsRules = backgroundPage.all_rules.potentiallyApplicableRulesets(hostname);
          let secureMessage = "Secure Connection";
          let secureMessageHttps = "Secure Connection-HTTPS";

          if(httpsRules.size){
              httpsRules.forEach((ruleSet) => {
                  if(ruleSet.active && this._hasMainFrameHttpsRule(ruleSet.rules)){
                      this.httpsStatusText = secureMessageHttps;
                  }
              });
          }
          else if(/^https/.exec(tab.url)){
              this.httpsStatusText = secureMessage;
              return;
          }
      },

      _hasMainFrameHttpsRule: function(rules){
          let hasHttps = false;
          rules.forEach((rule) => {
              if(rule.to === "https:"){
                  hasHttps = true;
              }
          });
          return hasHttps;
      }
  }
);


module.exports = Site;

