const Parent = window.DDG.base.Model;

var backgroundPage = chrome.extension.getBackgroundPage();

function TrackerList (attrs) {

    Parent.call(this, attrs);
    this.companyList = backgroundPage.Companies.getTopBlocked(5);

    var max = 0;
    if(this.companyList && this.companyList.length){
        max = this.companyList[0].count;
    }

    this.companyListM = this.companyList.map(
        (site) => {
            var x = site.count;

            // calc max using pixels instead of % to make margins easier
            // max width: 270 - (7*2) = 256
            return {name: site.name, count:site.count,
                p: Math.floor(x * 256 / max)};
        });

};


TrackerList.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'trackerList'

  }
);


module.exports = TrackerList;

