const bel = require('bel');

module.exports = function () {

    return bel`<div class="js-trackerlist">
        <div class="js-menu-title">Top Blocked</div>
        <ul class="js-menu-item-list">
            ${this.model.companyListM.map((site) => bel`<li class="site-co"> <div class="js-site-blocker-bar" style="width:${site.p}px"></div>
                                          ${site.name} <div class="js-site-blocker-count">${site.count}</div></li>`)}
        </ul>
    </div>`
}

