const Parent = window.DDG.base.Model;

var backgroundPage = chrome.extension.getBackgroundPage();

function TrackerList (attrs) {

    Parent.call(this, attrs);
    this.companyList = backgroundPage.Companies.getTopBlocked(5);

};


TrackerList.prototype = $.extend({},
  Parent.prototype,
  {

  }
);


module.exports = TrackerList;

