const bel = require('bel');

module.exports = function () {

    return bel`<section>
        <h3 class="menu-title">Top Blocked</h3>
        <ul class="menu-list top-blocked">
            ${this.model.companyListMap.map((company) => bel`
              <li class="top-blocked__li">
                  <div class="top-blocked__li__blocker-bar" style="width:${company.px}px"></div>
                  <div class="top-blocked__li__blocker-count pull-right">${company.count}</div>
                  <span class="top-blocked__li__company-name">${company.name}</span>
              </li>`)}
        </ul>
    </section>`
}

