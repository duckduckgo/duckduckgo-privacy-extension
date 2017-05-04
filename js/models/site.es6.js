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
          let url = backgroundPage.utils.parseUrl(tab.url);
          let httpsRules = backgroundPage.all_rules.potentiallyApplicableRulesets(url.hostname);

          if(/^https/.exec(tab.url)){
              this.httpsState = 'default';
          }
          else if(httpsRules.size){
              httpsRules.forEach((ruleSet) => {
                  if(ruleSet.active && ruleSet.apply(tab.url)){
                      this.httpsState = 'default'; // figure out if this is upgraded later
                  }
              });
          }

          this.httpsStatusText = httpsStates[this.httpsState];
      }
  }
);

module.exports = Site;
