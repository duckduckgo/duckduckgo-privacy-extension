const Parent = window.DDG.base.Model;

var backgroundPage = chrome.extension.getBackgroundPage();

function TrackerList (attrs) {

    Parent.call(this, attrs);
    this.companyList = backgroundPage.Companies.getTopBlocked(5);

    var max = 0;
    if(this.companyList && this.companyList.length){
        max = this.companyList[0].count;
    }

    this.companyListMap = this.companyList.map(
        (company) => {
            var x = company.count;

            // calc max using pixels instead of % to make margins easier
            // max width: 270 - (14*2) = 242
            return {
              name: company.name,
              count: company.count,
              px: Math.floor(x * 242 / max)
            };
        });

};


TrackerList.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'trackerList'

  }
);


module.exports = TrackerList;

