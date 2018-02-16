const Parent = window.DDG.base.Model;
const context = 'options'

function PrivacyOptions (attrs) {
    // set some default values for the toggle switches in the template
    attrs.trackerBlockingEnabled = true;
    attrs.httpsEverywhereEnabled = true;
    attrs.embeddedTweetsEnabled = false;

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
              this.fetch({updateSetting: {name: k, value: this[k]}, context: context});
          }
      },

      getSettings: function () {
          let self = this
          return new Promise((resolve, reject) => {
              self.fetch({getSetting: 'all', context: context}).then((settings) => {
                  self.trackerBlockingEnabled = settings['trackerBlockingEnabled'];
                  self.httpsEverywhereEnabled = settings['httpsEverywhereEnabled'];
                  self.embeddedTweetsEnabled = settings['embeddedTweetsEnabled'];
                  resolve();
              })
          });
      }
  }
);


module.exports = PrivacyOptions;

