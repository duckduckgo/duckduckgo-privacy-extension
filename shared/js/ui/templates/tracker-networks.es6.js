const bel = require('bel')
const header = require('./shared/sliding-subview-header.es6.js')

module.exports = function () {
  if (!this.model) {
    return bel`<section class="sliding-subview
    sliding-subview--has-fixed-header">
      ${header('Tracker Networks')}
    </section>`
  } else {
    return bel`<div class="site-info site-info--details card card--no-top-margin">
      <h1 class="site-info__domain">${this.model.site.domain}</h1>
      ${trackersBlockedOrFound(this.model)}
      <ol class="default-list site-info__trackers__company-list">
        ${renderTrackerDetails(
          this.model.companyListMap,
          this.model.DOMAIN_MAPPINGS
        )}
      </ol>
    </div>`
  }
}

function trackersBlockedOrFound (model) {
  let msg = ''
  if (model.site &&
     (model.site.isWhitelisted || model.site.trackerNetworks.length === 0)) {
    msg = 'Trackers found'
  } else {
    msg = 'Trackers blocked'
  }
  return bel`<h3 class="padded">${msg}</h3>`
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
        <span class="block">${c.name}</span>
        <ol class="default-list site-info__trackers__company-list__url-list">
          ${c.urls.map((url) => {
            let category = ''
            if (DOMAIN_MAPPINGS[url.toLowerCase()]) {
              category = DOMAIN_MAPPINGS[url.toLowerCase()].t
            }
            return bel`<li>
              <span class="url">${url}</span>
              <span class="category pull-right">${category}</span>
            </li>`
          })}
        </ol>
      </li>`
    })
  }
}
