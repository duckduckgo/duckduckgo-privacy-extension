const bel = require('bel')
const hero = require('./shared/hero.es6.js')
const { trackerNetworksText, trackerNetworksIcon, trackerNetworksExplainer } = require('./shared/tracker-networks-text.es6.js')
const { renderAboutOurTrackingProtectionsLink, renderTrackerDetails } = require('./shared/utils.js')

module.exports = function () {
    if (!this.model) {
        return bel`<section class="sliding-subview
    sliding-subview--has-fixed-header">
</section>`
    } else {
        const explainerText = trackerNetworksExplainer(this.model.site)
        return bel`<div class="tracker-networks site-info site-info--full-height card">
    <div class="js-tracker-networks-hero">
        ${renderHero(this.model.site)}
    </div>
    <div class="tracker-networks__explainer border--bottom--inner text--center">
        <p>${explainerText}</p>
        <p>${renderAboutOurTrackingProtectionsLink()}</p>
    </div>
    <div class="tracker-networks__details tracker-networks__details--margin js-tracker-networks-details">
        <ol class="default-list site-info__trackers__company-list" aria-label="List of tracker networks">
            ${renderTrackerDetails(this.model.aggregationStats.blocked.list, this.model.site)}
        </ol>
    </div>
</div>`
    }
}

function renderHero (site) {
    site = site || {}

    return bel`${hero({
        status: 'major-networks-' + trackerNetworksIcon(site),
        title: site.domain,
        subtitle: trackerNetworksText(site, false),
        showClose: true
    })}`
}
