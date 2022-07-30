const bel = require('bel')
const hero = require('./shared/hero.es6.js')
const { renderAboutOurTrackingProtectionsLink, renderTrackerDetails } = require('./shared/utils.js')
const advertisingLearnMoreURL = 'https://help.duckduckgo.com/duckduckgo-help-pages/privacy/web-tracking-protections/#3rd-party-tracker-loading-protection'
function calculateOverallCount (model) {
    if (!model) {
        return 0
    }
    return model.aggregationStats.allowed.entitiesCount
}

module.exports = function () {
    if (!this.model) {
        return bel`<section class="sliding-subview sliding-subview--has-fixed-header"></section>`
    }
    const overallCount = calculateOverallCount(this.model)
    if (!this.model.site.protectionsEnabled) {
        return bel`<div class="tracker-networks site-info site-info--full-height card">
            <div class="js-non-tracker-networks-hero">
                ${renderHero(this.model.site, overallCount)}
            </div>
            <div class="non-tracker-networks__explainer text--center">
                No third-party requests were blocked from loading because Protections are turned off for this site. If a company's requests are loaded, it can allow them to profile you.<br />

                ${renderAboutOurTrackingProtectionsLink()}
            </div>
            <div class="tracker-networks__details padded js-non-tracker-networks-details">
                <ol class="default-list site-info__trackers__company-list ${this.model.aggregationStats.other.entitiesCount ? '' : 'is-hidden'}" aria-label="List of tracker networks">
                    <li>The following domains’ requests were loaded.</li>
                    ${renderTrackerDetails(this.model.aggregationStats.allowed.list, this.model.site)}
                </ol>
            </div>
        </div>
        `
    }

    // For changing the text when only the 'other' list is shown
    const onlyOther = !this.model.aggregationStats.firstParty.entitiesCount && !this.model.aggregationStats.ignored.entitiesCount && !this.model.aggregationStats.adAttribution.entitiesCount
    if (!overallCount) {
        return bel`<section class="tracker-networks site-info site-info--full-height card">
        <div class="js-non-tracker-networks-hero">
            ${renderHero(this.model.site, overallCount)}
        </div>
        <div class="non-tracker-networks__explainer text--center">
            We did not detect requests from any third-party domains.<br />
            ${renderAboutOurTrackingProtectionsLink()}
        </div>
    </section>`
    } else {
        function renderSection (aggregationStatsSection, headingText, site) {
            return bel`<ol class="default-list site-info__trackers__company-list ${aggregationStatsSection.entitiesCount ? '' : 'is-hidden'}">
                <li class="border--bottom border--top padded--top-half padded--bottom-half text--center">${headingText}</li>
                ${renderTrackerDetails(aggregationStatsSection.list, site)}
            </ol>`
        }
        const adAttributionSection = renderSection(
            this.model.aggregationStats.adAttribution,
            bel`<span>The following domain’s requests were loaded because a ${this.model.site.domain} ad on DuckDuckGo was recently clicked. These requests help evaluate ad effectiveness. All ads on DuckDuckGo are non-profiling.<br />
            <a href="${advertisingLearnMoreURL}" target="_blank">How our search ads impact our protections</a></span>`,
            this.model.site
        )
        const ignoredSection = renderSection(
            this.model.aggregationStats.ignored,
            'The following domains’ requests were loaded to prevent site breakage.',
            this.model.site
        )
        const firstPartySection = renderSection(
            this.model.aggregationStats.firstParty,
            `The following domains’ requests were loaded because they’re associated with ${this.model.site.domain}.`,
            this.model.site
        )
        const otherSection = renderSection(
            this.model.aggregationStats.other,
            `The following domains' requests were ${onlyOther ? '' : 'also'} loaded.`,
            this.model.site
        )

        return bel`<div class="tracker-networks site-info site-info--full-height card">
    <div class="js-non-tracker-networks-hero">
        ${renderHero(this.model.site, overallCount)}
    </div>
    <div class="non-tracker-networks__explainer text--center">
        The following third-party domains’ requests were loaded. If a company's requests are loaded, it can allow them to profile you, though our other web tracking protections still apply.<br /><br />
        ${renderAboutOurTrackingProtectionsLink()}
    </div>
    <div class="tracker-networks__details padded js-non-tracker-networks-details">
        ${adAttributionSection}
        ${ignoredSection}
        ${firstPartySection}
        ${otherSection}
    </div>
</div>`
    }
}

function renderHero (site, overallCount) {
    site = site || {}
    let status = 'non-networks'
    if (!overallCount) {
        status = 'zero'
    }

    return bel`${hero({
        status,
        title: site.domain,
        showClose: true
    })}`
}
