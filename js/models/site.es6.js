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
      toggleWhitelist: function () {
          let site = this._getSite();
          if(site){
              site.toggleWhiteList();
              this.isWhitelisted = site.whiteListed;
          }
      },

      setWhitelistStatus: function() {
          let site = this._getSite();
          if(site){
            this.isWhitelisted = site.whiteListed;
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
      },

      setHttpsMessage: function() {
          let tab = backgroundPage.tabs[this.tabId];

          if(/^https/.exec(tab.url)){
              this.httpsState = 'default';
          }
          else{
              let url = backgroundPage.utils.parseURL(tab.url);
              let httpsRules = backgroundPage.all_rules.potentiallyApplicableRulesets(url.hostname);
              
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
