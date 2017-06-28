const Parent = window.DDG.base.Model;
const backgroundPage = chrome.extension.getBackgroundPage();

// TODO move to settings?
const httpsStates = {
        'default':  'Secure Connection',
        'upgraded': 'Forced Secure Connection',
        'none':     'Secure Connection Unavailable'
    };

function Site (attrs) {

    attrs.disabled = true; // disabled by default
    attrs.httpsState = 'none';
    attrs.httpsStatusText = httpsStates[attrs.httpsState];
    Parent.call(this, attrs);
};


Site.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'site',

      toggleWhitelist: function () {
          if (this.tab.site) {
              this.isWhitelisted = !this.isWhitelisted;
              this.tab.site.setWhitelisted('whitelisted', this.isWhitelisted);
              this.tab.site.notifyWhitelistChanged();
          }
      },

      setSiteObj: function() {
          if (!this.tab) {
              this.domain = 'new tab'; // tab can be null for firefox new tabs
              this.siteRating = '';
          }
          else {
              this.isWhitelisted = this.tab.site.whitelisted;
              let special = this.tab.site.specialDomain();
              if (special) {
                  this.domain = special; // eg "extensions", "options", "new tab"
              }
              else {
                  this.disabled = false;
              }
          }
      },

      updateTrackerCount: function() {
          if (this.tab) {
            this.trackerCount = this.tab.getBadgeTotal();
            this.potential = Object.keys(this.tab.potentialBlocked).length;
            this.updateSiteScore();
          }
      },

      updateSiteScore: function() {
          this.siteRating = this.tab.site.score.get()
      },

      setHttpsMessage: function() {
          if (!this.tab) {
              return;
          }

          if (this.tab.upgradedHttps) {
              this.httpsState = 'upgraded';
          }
          else if (/^https/.exec(this.tab.url)) {
              this.httpsState = 'default';
          }

          this.httpsStatusText = httpsStates[this.httpsState];
      }
  }
);

module.exports = Site;
