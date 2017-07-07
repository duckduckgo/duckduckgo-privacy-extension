const Parent = window.DDG.base.Model;
const backgroundPage = chrome.extension.getBackgroundPage();

function TrackerListTopBlocked (attrs) {

    // TODO: clean this up a bit
    Parent.call(this, attrs);

    this.companyList = backgroundPage.Companies.getTopBlocked(attrs.numCompanies);

    // find company with largest number of trackers
    let maxCount = 0;
    if (this.companyList && this.companyList.length) {
        maxCount = this.companyList[0].count;
    }

    this.companyListMap = this.companyList.map(
        (company) => {
            // calc max using pixels instead of % to make margins easier
            // max width: 270 - (horizontal margin + padding in css) = 228
            return {
              name: company.name,
              count: company.count,
              px: Math.floor(company.count * 228 / maxCount)
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

