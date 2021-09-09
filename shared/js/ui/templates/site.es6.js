const bel = require('bel')
const ratingHero = require('./shared/rating-hero.es6.js')
const trackerNetworksIcon = require('./shared/tracker-network-icon.es6.js')
const trackerNetworksText = require('./shared/tracker-networks-text.es6.js')
const constants = require('../../../data/constants')

module.exports = function () {
    const tosdrMsg = (this.model.tosdr && this.model.tosdr.message) ||
        constants.tosdrMessages.unknown

    return bel`<div class="site-info site-info--main">
    <ul class="default-list">
        <li class="site-info__protection-banner-li ${this.model.protectionsEnabled ? 'is-hidden' : ''}">
            <div class="site-info__protection-banner-text-line">Privacy Protection disabled.</div>
            <a href="javascript:void(0)" class="link-secondary-bold js-site-enable-protections protection-banner-button" role="button">
                <span>Enable</span>
            </a>
        </li>

        <li class="border--bottom site-info__rating-li main-rating js-hero-open">
            ${ratingHero(this.model, {
        showOpen: !this.model.disabled
    })}
        </li>
        <li class="text--center padded border--bottom warning_bg bold ${this.model.displayBrokenUI ? '' : 'is-hidden'}">
            We temporarily disabled Privacy Protection as it appears to be breaking this site.
        </li>
        <li class="site-info__li--https-status padded border--bottom">
            <p class="site-info__https-status bold">
                <span class="site-info__https-status__icon
                    is-${this.model.httpsState}">
                </span>
                <span class="text-line-after-icon">
                    ${this.model.httpsStatusText}
                </span>
            </p>
        </li>
        <li class="js-site-tracker-networks js-site-show-page-trackers site-info__li--trackers padded border--bottom">
            <a href="javascript:void(0)" class="link-secondary bold" role="button">
                ${renderTrackerNetworks(this.model)}
            </a>
        </li>
        <li class="js-site-privacy-practices site-info__li--privacy-practices padded border--bottom">
            <span class="site-info__privacy-practices__icon
                is-${tosdrMsg.toLowerCase()}">
            </span>
            <a href="javascript:void(0)" class="link-secondary bold" role="button">
                <span class="text-line-after-icon"> ${tosdrMsg} Privacy Practices </span>
                <span class="icon icon__arrow pull-right"></span>
            </a>
        </li>
    </ul>
</div>`

    function renderTrackerNetworks (model) {
        const isActive = model.protectionsEnabled ? 'is-active' : ''

        return bel`<a href="javascript:void(0)" class="site-info__trackers link-secondary bold">
    <span class="site-info__trackers-status__icon
        icon-${trackerNetworksIcon(model.siteRating, !model.protectionsEnabled, model.totalTrackerNetworksCount)}"></span>
    <span class="${isActive} text-line-after-icon"> ${trackerNetworksText(model, false)} </span>
    <span class="icon icon__arrow pull-right"></span>
</a>`
    }
}
