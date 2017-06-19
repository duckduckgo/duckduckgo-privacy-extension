const bel = require('bel');

module.exports = function () {

    return bel`<section class="top-blocked card">
        <h3 class="menu-title">Top blocked over time</h3>
        <ul class="menu-list top-blocked__list">
            ${this.model.companyListMap.map((company) => bel`
              <li class="top-blocked__li">
                  <div class="top-blocked__li__blocker-count pull-right">${company.count}</div>
                  <span class="top-blocked__li__company-name">${company.name}</span>
                  <div class="top-blocked__li__blocker-bar" >
                      <div class="top-blocked__li__blocker-bar top-blocked__li__blocker-bar--fg js-top-blocked-bar-fg"
                      style="width: 0px" data-width="${company.px}px">
                      </div>
                  </div>
              </li>`)}
        </ul>
    </section>`
}

