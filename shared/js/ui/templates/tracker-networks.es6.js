const bel = require('bel')
const hero = require('./shared/hero.es6.js')
const trackerNetworksIcon = require('./shared/tracker-network-icon.es6.js')
const { trackerNetworksText } = require('./shared/tracker-networks-text.es6.js')
const { renderAboutOurTrackingProtectionsLink, renderTrackerDetails } = require('./shared/utils.js')

module.exports = function () {
    if (!this.model) {
        return bel`<section class="sliding-subview
    sliding-subview--has-fixed-header">
</section>`
    } else {
        const protectionsEnabledOrNoTrackers = this.model.site.protectionsEnabled || this.model.aggregationStats.blocked.entitiesCount
        return bel`<div class="tracker-networks site-info site-info--full-height card">
    <div class="js-tracker-networks-hero">
        ${renderHero(this.model.site)}
    </div>
    <div class="tracker-networks__explainer border--bottom--inner text--center ${protectionsEnabledOrNoTrackers ? 'is-hidden' : ''}">
        No tracking requests were blocked from loading because Protections are turned off for this site. If a company's requests are loaded, it can allow them to profile you.<br />
        ${renderAboutOurTrackingProtectionsLink()}
    </div>
    <div class="tracker-networks__explainer border--bottom--inner text--center ${protectionsEnabledOrNoTrackers ? '' : 'is-hidden'}">
        The following third-party domains’ requests were blocked from loading because they were identified as tracking requests. If a company's requests are loaded, it can allow them to profile you.<br />
        ${renderAboutOurTrackingProtectionsLink()}
    </div>
    <div class="tracker-networks__details padded js-tracker-networks-details">
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
        status: trackerNetworksIcon(site.siteRating, site.protectionsEnabled, site.aggregationStats.blocked.entitiesCount),
        title: site.domain,
        subtitle: `${trackerNetworksText(site, false)}`,
        showClose: true
    })}`
}
