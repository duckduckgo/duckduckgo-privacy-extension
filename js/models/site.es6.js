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
          if(this.tab.site){
              this.isWhitelisted = !this.isWhitelisted;
              this.tab.site.setWhitelisted(this.isWhitelisted);
              this.tab.site.notifyWhitelistChanged();
          }
      },

      setSiteObj: function() {
          if (!this.tab) {
              this.domain = '-';    // should not happen
          }
          else {
              this.isWhitelisted = this.tab.site.whiteListed;
              
              let special = this.tab.site.specialDomain();
              if (special) {
                  this.domain = special;    // eg "extensions", "options", "new tab"
              }
              else {
                  this.disabled = false;
              }
          }
      },

      updateTrackerCount: function() {
          if(this.tab){
            this.trackerCount = this.tab.dispTotal();
            this.potential = Object.keys(this.tab.potentialBlocked).length;
          }
      },

      setHttpsMessage: function() {
          if (!this.tab) {
              return;
          }

          if(/^https/.exec(this.tab.url)){
              this.httpsState = 'default';
          }
          else{
              let url = backgroundPage.utils.parseURL(this.tab.url);
              let httpsRules = backgroundPage.all_rules.potentiallyApplicableRulesets(url.hostname);

              httpsRules.forEach((ruleSet) => {
                  if(ruleSet.active && ruleSet.apply(this.tab.url)){
                      this.httpsState = 'default'; // figure out if this is upgraded later
                  }
              });
          }

          this.httpsStatusText = httpsStates[this.httpsState];
      }
  }
);

module.exports = Site;
