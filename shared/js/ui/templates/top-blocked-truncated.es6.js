const bel = require('bel');
const listItems = require('./top-blocked-truncated-list-items.es6.js');

module.exports = function () {
    if (this.model.companyListMap && this.model.companyListMap.length > 0) {
        return bel`<div class="top-blocked top-blocked--truncated">
    <div class="top-blocked__see-all js-top-blocked-see-all">
        <a href="javascript:void(0)" class="link-secondary">
            <span class="icon icon__arrow pull-right"></span>
            Top Tracking Offenders
            <span class="top-blocked__list top-blocked__list--truncated top-blocked__list--icons">
                ${listItems(this.model.companyListMap)}
            </span>
        </a>
    </div>
</div>`;
    }
};
