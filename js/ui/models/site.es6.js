const Parent = window.DDG.base.Model;
const backgroundPage = chrome.extension.getBackgroundPage();

const httpsStates = {
    'default':  'Secure Connection',
    'upgraded': 'Forced Secure Connection',
    'none':     'Secure Connection Unavailable'
};

const whitelistStates = {
    'isWhitelisted': 'Blocking off (this domain)',
    'notWhitelisted': 'Blocking on (this domain)',
}

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

      setSiteObj: function() {
          if (!this.tab) {
              this.domain = 'new tab'; // tab can be null for firefox new tabs
              this.siteRating = '';
          }
          else {
              this.isWhitelisted = this.tab.site.whitelisted;
              this.setWhitelistStatusText();
              let special = this.tab.site.specialDomain();
              if (special) {
                  this.domain = special; // eg "extensions", "options", "new tab"
              }
              else {
                  this.disabled = false;
              }
          }
      },

      setHttpsMessage: function () {
          if (!this.tab) return

          if (this.tab.upgradedHttps) {
              this.httpsState = 'upgraded';
          }
          else if (/^https/.exec(this.tab.url)) {
              this.httpsState = 'default';
          }

          this.httpsStatusText = httpsStates[this.httpsState];
      },

      setWhitelistStatusText: function () {
          if (this.isWhitelisted) {
              this.whitelistStatusText = whitelistStates['isWhitelisted'];
          } else {
              this.whitelistStatusText = whitelistStates['notWhitelisted'];
          }
      },

      update: function () {
          let rerenderFlag = false

          if (this.tab) {
              const updatedTrackersCount = this.tab.getUniqueTrackersCount()
              const updatedTrackersBlockedCount = this.tab.getUniqueTrackersBlockedCount()
              const updatedSiteRating = this.tab.site.score.get()

              if (updatedTrackersCount !== this.trackersCount) {
                  this.trackersCount = updatedTrackersCount
                  rerenderFlag = true
              }
              if (updatedTrackersBlockedCount !== this.trackersBlockedCount) {
                  this.trackersBlockedCount = updatedTrackersBlockedCount
                  rerenderFlag = true
              }
              if (updatedSiteRating !== this.siteRating) {
                  this.siteRating = updatedSiteRating
                  rerenderFlag = true
              }
          }

          return rerenderFlag
      },

      toggleWhitelist: function () {
          if (this.tab && this.tab.site) {
              this.isWhitelisted = !this.isWhitelisted;
              backgroundPage.tabManager.whitelistDomain({
                  list: 'whitelisted',
                  domain: this.tab.site.domain,
                  value: this.isWhitelisted
              });
              this.tab.site.notifyWhitelistChanged();
              this.setWhitelistStatusText();
          }
      }

  }
);

module.exports = Site;
