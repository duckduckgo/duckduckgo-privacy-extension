const Parent = window.DDG.base.Model;
const backgroundPage = chrome.extension.getBackgroundPage();

function SiteTrackerList (attrs) {

    attrs.trackerList = getTrackerList();
    Parent.call(this, attrs);

};


SiteTrackerList.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'siteTrackerList',

      getTrackerList: function () {
          if (!this.tab) return [];

          return Object.keys(this.tab.potentialBlocked);
      }

  }
);


module.exports = SiteTrackerList;

