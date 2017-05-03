const Parent = window.DDG.base.Model;

function Site (attrs) {

    attrs.httpsIcon = 'orange';
    attrs.httpsStatusText = 'Forced Secure Connection';
    attrs.blockMessage = 'Trackers Blocked';

    Parent.call(this, attrs);
};


Site.prototype = $.extend({},
  Parent.prototype,
  {
      toggleWhitelist: function (s) {
          console.log(`Site toggleWhitelist()`);
          this.isWhitelisted = !this.isWhitelisted;
          
      }

  }
);


module.exports = Site;

