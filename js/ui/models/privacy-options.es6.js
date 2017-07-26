const Parent = window.DDG.base.Model;
const backgroundPage = chrome.extension.getBackgroundPage();

function PrivacyOptions (attrs) {

    attrs.trackerBlockingEnabled = backgroundPage.settings.getSetting('trackerBlockingEnabled');
    attrs.httpsEverywhereEnabled = backgroundPage.settings.getSetting('httpsEverywhereEnabled');
    attrs.embeddedTweetsEnabled = backgroundPage.settings.getSetting('embeddedTweetsEnabled');
    Parent.call(this, attrs);
};


PrivacyOptions.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'privacyOptions',

      toggle: function (k) {
          if (this.hasOwnProperty(k)) {
              this[k] = !this[k];
              console.log(`PrivacyOptions model toggle ${k} is now ${this[k]}`);

              backgroundPage.settings.updateSetting(k, this[k]);
          }
      }

  }
);


module.exports = PrivacyOptions;

