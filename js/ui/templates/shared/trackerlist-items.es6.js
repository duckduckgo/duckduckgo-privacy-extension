const bel = require('bel');

module.exports = function (trackerListMap) {
    return trackerListMap.map((obj) => {

        // Special case: in a page's tracker list, "unkown" company contains
        // a list of trackers we can't resolve to a company. In this case,
        // we render each tracker domain individually with no count
        // (we don't have individual tracker count data for these yet)
        if (obj.name.toLowerCase() === 'unknown') {
            return obj.urls.map((url) => generateLi({ name: url }, true));
        } else {
            return generateLi(obj);
        }

        function generateLi (data, isUnknownCompany) {
            let isHidden = '';
            if (isUnknownCompany) { isHidden = 'is-hidden'; }

            return bel`<li class="top-blocked__li">
              <span class="top-blocked__li__company-name">${data.name}</span>
              <div class="top-blocked__li__blocker-count pull-right ${isHidden}">${data.count}</div>
              <div class="top-blocked__li__blocker-bar ${isHidden}">
                  <div class="top-blocked__li__blocker-bar top-blocked__li__blocker-bar--fg js-top-blocked-graph-bar-fg"
                  style="width: 0px" data-width="${data.px}px">
                  </div>
              </div>
            </li>`;
        }

  })
}
