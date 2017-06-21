const Parent = window.DDG.base.Model;
const backgroundPage = chrome.extension.getBackgroundPage();

function TrackerListCurrentPage (attrs) {

    this.trackerList = this.getTrackerList();
    this.trackerListMap = trackerList; // TODO: generate map with counts
    Parent.call(this, attrs);
};


TrackerListCurrentPage.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'trackerListCurrentPage',

      getTrackerList: function () {
          if (!this.tab) return [];
          return Object.keys(this.tab.potentialBlocked);
      }

  }
);


module.exports = TrackerListCurrentPage;

