const Parent = window.DDG.base.Model;

function PrivacyOptions (attrs) {

    // test data

    console.log("new privacy options model");
    
    attrs.blockTrackers = true;
    attrs.forceHTTPS = true;

    Parent.call(this, attrs);

};


PrivacyOptions.prototype = $.extend({},
  Parent.prototype,
  {
      toggle: function (k) {
          if (this.hasOwnProperty(k)) {
              this[k] = !this[k];
              console.log(`PrivacyOptions model toggle ${k} is now ${this[k]}`);
          }
      }

  }
);


module.exports = PrivacyOptions;

