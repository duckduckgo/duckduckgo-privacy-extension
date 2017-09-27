const bel = require('bel')

module.exports = function (trackerListMap) {
    return trackerListMap.map((data) => {

        // TODO: move this to page-level tracker list tbd
        // Special case: in a page's tracker list, "unkown" company contains
        // a list of trackers we can't resolve to a company. In this case,
        // we render each tracker domain individually with no count
        // (we don't have individual tracker count data for these yet)
        // if (obj.name.toLowerCase() === 'unknown') {
        //     return obj.urls.map((url) => generateLi({ name: url }, true))
        // } else {
            // return generateLi(obj)
        // }

        // function generateLi (data) {
            // TODO: remove isUnknownCompany/isHidden to page-leve tracker list
            // let isHidden = ''
            // if (isUnknownCompany) isHidden = 'is-hidden'

            return bel`<li class="top-blocked__li">
              <div class="top-blocked__li__company-name">${data.name}</div>
              <div class="top-blocked__li__blocker-bar js-top-blocked-graph-bar"
                  style="width: 0px" data-width="${data.px}px">
              </div>
              <div class="top-blocked__li__blocker-pct">
                  ${data.percent}%
              </div>
            </li>`
        // }
    })
}
