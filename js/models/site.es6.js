const Parent = window.DDG.base.Model;

var backgroundPage = chrome.extension.getBackgroundPage();

// TODO move to settings?
const httpsStates = {
        'default':  'Secure Connection',
        'upgraded': 'Forced Secure Connection',
        'none':     'Secure Connection Unavailable'
    };

function Site (attrs) {

    attrs.disabled = true;     // disabled by default
    attrs.httpsState = 'none';

    // set message and icon based on httpsState
    attrs.httpsStatusText = httpsStates[attrs.httpsState];

    Parent.call(this, attrs);

};


Site.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'site',

      toggleWhitelist: function () {
          if(this.site){
              this.isWhitelisted = !this.isWhitelisted;
              this.site.setWhitelisted(this.isWhitelisted);
              this.site.notifyWhitelistChanged();
          }
      },

      setSiteObj: function() {
          let tab = backgroundPage.tabs[this.tabId];
          let host = backgroundPage.utils.extractHostFromURL(tab.url);
          let site = backgroundPage.Sites.get(host);

          // Determine if this is a special page, eg extensions, and reset domain and disabled flag.
          
          this.disabled = true;

          if (site) {
              this.site = site;
              this.isWhitelisted = site.whiteListed;
              
              let special = site.specialDomain();
              if (special) {
                  this.domain = special;    // eg "extensions", "options", "new tab"
              }
              else {
                  this.disabled = false;
              }
          }
          else {
              this.domain = '-';    // should not happen
          }
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
