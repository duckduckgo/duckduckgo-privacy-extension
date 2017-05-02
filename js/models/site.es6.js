const Parent = window.DDG.base.Model;

function Site (attrs) {

    // domain: "cnn.com",
    // isWhitelisted: false,
    // siteRating: 'B',
    // trackerCount: 21
    

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
      }

  }
);


module.exports = Site;

