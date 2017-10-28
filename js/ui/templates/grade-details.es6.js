const bel = require('bel')
const header = require('./shared/sliding-subview-header.es6.js')
const siteRating = require('./shared/site-rating.es6.js')
const siteRatingExplainer = require('./shared/site-rating-explainer.es6.js')

module.exports = function () {

    if (!this.model) {
        return bel`<section class="sliding-subview
        sliding-subview--has-fixed-header">
            ${header('Grade Details')}
        </section>`
    } else {
        return bel`<div class="site-info site-info--details card card--no-top-margin">
            <h1 class="site-info__domain">${this.model.site.domain}</h1>
            ${siteRating(this.model.site.siteRating, true)}
            ${siteRatingExplainer(this.model.site.siteRating)}
            <h2 class="site-info__https-status padded border--bottom">
                ${httpsMsg(this.model.site.httpsState)}
                <div class="float-right"></div>
            </h2>
            ${trackersBlockedOrFound(this.model)}
            <ol class="default-list site-info__trackers__company-list">
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

function trackersBlockedOrFound (model) {
    let msg = ''
    if (model.site && model.site.isWhitelisted) {
        msg = 'Trackers found'
    } else {
        msg = 'Trackers blocked'
    }
    return bel`<h3 class="padded">${msg}</h3>`
}

function renderTrackerDetails (companyListMap) {
    if (companyListMap.length === 0) {
        return bel`<li class="is-empty">None</li>`
    }
    if (companyListMap && companyListMap.length > 0) {
        return companyListMap.map((c, i) => {
            return bel`<li>
                <span class="block">${c.name}</span>
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
