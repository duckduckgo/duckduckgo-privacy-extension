const bel = require('bel')
const header = require('./shared/sliding-subview-header.es6.js')
const listItems = require('./top-blocked-list-items.es6.js')
const noData = require('./shared/top-blocked-no-data.es6.js')

module.exports = function () {
    if (!this.model) {
        return bel`<div class="sliding-subview
    sliding-subview--has-fixed-header top-blocked-header">
    ${header('All Trackers')}
</div>`
    } else {
        return bel`<div class="js-top-blocked-content">
    ${renderPctPagesWithTrackers(this.model)}
    ${renderList(this.model)}
    ${renderResetButton(this.model)}
</div>`
    }
}

function renderPctPagesWithTrackers (model) {
    let msg = ''
    if (model.lastStatsResetDate) {
        const d = new Date(model.lastStatsResetDate).toDateString()
        if (d) msg = ` since ${d}`
    }
    if (model.pctPagesWithTrackers) {
        return bel`<p class="top-blocked__pct card">
    Trackers were found on <b>${model.pctPagesWithTrackers}%</b>
    of web sites you've visited${msg}.
</p>`
    }
}

function renderList (model) {
    if (model.companyListMap.length > 0) {
        return bel`<ol aria-label="List of Trackers Found" class="default-list top-blocked__list card border--bottom">
    ${listItems(model.companyListMap)}
</ol>`
    } else {
        return bel`<ol class="default-list top-blocked__list">
    <li class="top-blocked__li top-blocked__li--no-data">
        ${noData()}
    </li>
</ol>`
    }
}

function renderResetButton (model) {
    if (model.companyListMap.length > 0) {
        return bel`<div class="top-blocked__reset-stats">
    <button class="top-blocked__reset-stats__button block
        js-reset-trackers-data">
        Reset Global Stats
    </button>
    <p>These stats are only stored locally on your device,
    and are not sent anywhere, ever.</p>
</div>`
    }
}
