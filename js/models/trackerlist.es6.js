const Parent = window.DDG.base.Model;

var backgroundPage = chrome.extension.getBackgroundPage();

function TrackerList (attrs) {


    Parent.call(this, attrs);
    this.companyList = backgroundPage.Companies.getTopBlocked(5);

    // test data for now
    // this might reference chrome.extension.getBackgroundPage();
    // to get the parent company data
    // this.testList = [

    //     {  domain: "google.com", blocked: 100 },
    //     {  domain: "facebook.com", blocked: 20 },
    //     {  domain: "twitter.com", blocked: 10 },
    //     {  domain: "amazon.com", blocked: 5 },
    //     {  domain: "adnexus.com", blocked: 4 }

    // ];

    // this.extensionIsEnabled = this.bg.settings.getSetting("extensionIsEnabled");
    // console.log("extension is enabled: ",  this.bg.settings.getSetting("extensionIsEnabled"));


};


TrackerList.prototype = $.extend({},
  Parent.prototype,
  {

  }
);


module.exports = TrackerList;

