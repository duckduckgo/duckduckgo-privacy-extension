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
      <ol class="default-list site-info__trackers__company-list">
        ${renderTrackerDetails(
          this.model.companyListMap,
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
    status: trackerNetworksIcon(site.siteRating, site.isWhitelisted, site.totalTrackersCount),
    title: site.domain,
    subtitle: `${trackerNetworksText(site)}`,
    showClose: true
  })}`
}

function renderTrackerDetails (companyListMap, DOMAIN_MAPPINGS) {
  if (companyListMap.length === 0) {
    return bel`<li class="is-empty">None</li>`
  }
  if (companyListMap && companyListMap.length > 0) {
    return companyListMap.map((c, i) => {
      if (c.name && c.name === 'unknown') c.name = '(Tracker network unknown)'
      return bel`<li>
        <div class="site-info__tracker__wrapper ${c.name.toLowerCase()} float-right">
          <span class="site-info__tracker__icon
            ${c.name.toLowerCase()}">
          </span>
        </div>
        <h1 class="site-info__domain block">${c.name}</h1>
        <ol class="default-list site-info__trackers__company-list__url-list">
          ${c.urls.map((url) => {
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
