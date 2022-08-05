const bel = require('bel')
const hero = require('./shared/hero.es6.js')
const { renderAboutOurTrackingProtectionsLink, renderTrackerDetails } = require('./shared/utils.js')
const { nonTrackerNetworksExplainer } = require('./shared/tracker-networks-text.es6')
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
    const explainerText = nonTrackerNetworksExplainer(this.model.site)
    const overallCount = calculateOverallCount(this.model)
    if (!this.model.site.protectionsEnabled) {
        return bel`<div class="tracker-networks site-info site-info--full-height card">
            <div class="js-non-tracker-networks-hero">
                ${renderHero(this.model.site, overallCount)}
            </div>
            <div class="non-tracker-networks__explainer text--center">
                <p>${explainerText}</p>
                ${renderAboutOurTrackingProtectionsLink()}
            </div>
            <div class="tracker-networks__details js-non-tracker-networks-details">
                <ol class="default-list site-info__trackers__company-list ${this.model.aggregationStats.allowed.entitiesCount ? '' : 'is-hidden'}" aria-label="List of tracker networks">
                    <li class="tracker-list-header border--bottom border--top padded--top-half padded--bottom-half text--center">The following domains’ requests were loaded.</li>
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
        <div class="non-tracker-networks__explainer border--bottom--inner text--center">
            <p>${explainerText}</p>
            <p>${renderAboutOurTrackingProtectionsLink()}</p>
        </div>
    </section>`
    } else {
        function renderSection (aggregationStatsSection, headingText, site) {
            const headingElement = headingText
                ? bel`<li class="tracker-list-header border--bottom border--top padded--top-half padded--bottom-half text--center">${headingText}</li>`
                : bel`<li class="padded--top-half padded--bottom-half border--top text--center"></li>`

            return bel`<ol class="default-list site-info__trackers__company-list ${aggregationStatsSection.entitiesCount ? '' : 'is-hidden'}">
                ${headingElement}
                ${renderTrackerDetails(aggregationStatsSection.list, site)}
            </ol>`
        }
        const adAttributionSection = renderSection(
            this.model.aggregationStats.adAttribution,
            bel`<span>The following domain’s requests were loaded because a ${this.model.site.domain} ad on DuckDuckGo was recently clicked. These requests help evaluate ad effectiveness. All ads on DuckDuckGo are non-profiling.<br/>
            <a class="about-link" href="${advertisingLearnMoreURL}" target="_blank">How our search ads impact our protections</a></span>`,
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
            onlyOther ? '' : 'The following domains\' requests were also loaded.',
            this.model.site
        )

        return bel`<div class="tracker-networks site-info site-info--full-height card">
    <div class="js-non-tracker-networks-hero">
        ${renderHero(this.model.site, overallCount)}
    </div>
    <div class="non-tracker-networks__explainer text--center">
        <p>${explainerText}</p>
        ${renderAboutOurTrackingProtectionsLink()}
    </div>
    <div class="tracker-networks__details js-non-tracker-networks-details">
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
