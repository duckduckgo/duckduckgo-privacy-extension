const Parent = window.DDG.base.Model;
const backgroundPage = chrome.extension.getBackgroundPage();

function TrackerListTopBlocked (attrs) {

    Parent.call(this, attrs);

    this.companyList = backgroundPage.Companies.getTopBlocked(attrs.numCompanies);
    var max = 0;
    if (this.companyList && this.companyList.length) {
        max = this.companyList[0].count;
    }
    this.companyListMap = this.companyList.map(
        (company) => {
            var x = company.count;
            // calc max using pixels instead of % to make margins easier
            // max width: 270 - (horizontal margin + padding in css) = 228
            return {
              name: company.name,
              count: company.count,
              px: Math.floor(x * 228 / max)
            };
        });

};


TrackerListTopBlocked.prototype = $.extend({},
  Parent.prototype,
  {

      modelName: 'trackerListTopBlocked'

  }
);


module.exports = TrackerListTopBlocked;

