const bel = require('bel')
const hero = require('./shared/hero.es6.js')
const trackerNetworksIcon = require('./shared/tracker-network-icon.es6.js')
const trackerNetworksText = require('./shared/tracker-networks-text.es6.js')

module.exports = function () {
    if (!this.model) {
        return bel`<section class="sliding-subview
    sliding-subview--has-fixed-header">
</section>`
    } else {
        return bel`<div class="tracker-networks site-info site-info--full-height card">
    <div class="js-tracker-networks-hero">
        ${renderHero(this.model.site)}
    </div>
    <div class="tracker-networks__explainer padded border--bottom--inner
        text--center">
        Tracker networks aggregate your web history into a data profile about you.
        Major tracker networks are more harmful because they can track and target you across more of the internet.
    </div>
    <div class="tracker-networks__details padded
        js-tracker-networks-details">
        <ol class="default-list site-info__trackers__company-list" aria-label="List of tracker networks">
            ${renderTrackerDetails(
        this.model,
        this.model.DOMAIN_MAPPINGS
    )}
        </ol>
    </div>
</div>`
    }
}

function renderHero (site) {
    site = site || {}

    return bel`${hero({
        status: trackerNetworksIcon(site.siteRating, site.isWhitelisted, site.totalTrackerNetworksCount),
        title: site.domain,
        subtitle: `${trackerNetworksText(site, false)}`,
        showClose: true
    })}`
}

function renderTrackerDetails (model, DOMAIN_MAPPINGS) {
    const companyListMap = model.companyListMap || {}
    if (companyListMap.length === 0) {
        return bel`<li class="is-empty">None</li>`
    }
    if (companyListMap && companyListMap.length > 0) {
        return companyListMap.map((c, i) => {
            let borderClass = ''
            if (c.name && c.name === 'unknown') {
                c.name = '(Tracker network unknown)'
            } else if (c.name && model.hasUnblockedTrackers(c, c.urlsList)) {
                const additionalText = ' associated domains'
                const domain = model.site ? model.site.domain : c.name
                c.name = model.site.isWhitelisted ? domain + additionalText : domain + additionalText + ' (not blocked)'
                borderClass = companyListMap.length > 1 ? 'border--top' : ''
            }
            return bel`<li class="${borderClass}">
    <div class="site-info__tracker__wrapper ${c.normalizedName} float-right">
        <span class="site-info__tracker__icon ${c.normalizedName}">
        </span>
    </div>
    <h1 class="site-info__domain block">${c.name}</h1>
    <ol class="default-list site-info__trackers__company-list__url-list" aria-label="Tracker domains for ${c.name}">
        ${c.urlsList.map((url) => {
        let category = ''
        if (DOMAIN_MAPPINGS[url.toLowerCase()]) {
            category = DOMAIN_MAPPINGS[url.toLowerCase()].t
        }
        return bel`<li>
                <div class="url">${url}</div>
                <div class="category">${category}</div>
            </li>`
    })}
    </ol>
</li>`
        })
    }
}
