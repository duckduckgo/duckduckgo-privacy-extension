const bel = require('bel');

module.exports = function () {

    return bel`<div class="js-trackerlist">
        <div class="js-menu-title">Top Blocked</div>
        <ul class="menu-list">
            ${this.model.companyListMap.map((company) => bel`
              <li class="site-co">
                  <div class="js-site-blocker-bar" style="width:${company.px}px"></div>
                  ${company.name}
                  <div class="js-site-blocker-count">${company.count}</div>
              </li>`)}
        </ul>
    </div>`
}

