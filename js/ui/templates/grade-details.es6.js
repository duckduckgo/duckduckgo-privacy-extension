const bel = require('bel')
const header = require('./shared/sliding-subview-header.es6.js')

module.exports = function () {

    if (!this.model) {
        return bel`<section class="sliding-subview
        sliding-subview--has-fixed-header">
            ${header('Grade Details')}
        </section>`
    } else {
        return bel`<div class="site-info site-info--details">
            <h1 class="site-info__domain">${this.model.site.domain}</h1>
            <div class="site-info__rating is-active
              site-info__rating--${this.model.site.siteRating.toLowerCase()}">
              ${this.model.site.siteRating}
            </div>
            <p class="site-info--details__explainer">
              This received a "${this.model.site.siteRating.toUpperCase()}"
              Privacy Grade for the reasons below.
            </p>
            <h2 class="site-info__https-status card card--padded border--bottom">
                ${httpsMsg(this.model.site.httpsState)}
                <div class="float-right"></div>
            </h2>
            <h3 class="card card--padded border--bottom">
                Trackers found
            </h3>
            <ol class="default-list site-info__trackers__company-list card card--padded">
                ${renderTrackerDetails(this.model.companyListMap)}
            </ol>
        </div>`
    }
}

function httpsMsg (httpsState) {
    if (httpsState === 'secure' || httpsState === 'upgraded') {
        return bel`<span>Connection is secure (HTTPS)</span>`
    }
    return bel`<span>Connection is insecure (HTTP)</span>`
}

function renderTrackerDetails (companyListMap) {
    if (companyListMap.length === 0) {
        return bel`<li class="is-empty">None</li>`
    }
    if (companyListMap && companyListMap.length > 0) {
        return companyListMap.map((c, i) => {
            return bel`<li>
                <strong>${c.name}</strong>
                <span class="site-info__tracker__icon
                    ${c.name.replace('.', '').toLowerCase()}
                    float-right"></span>
                <ol class="default-list site-info__trackers__company-list__url-list">
                    ${c.urls.map((url) => bel`<li>${url}</li>`)}
                </ol>
            </li>`
        })
    }
}
