const bel = require('bel')
const toggleButton = require('./shared/toggle-button.es6.js')
const ratingHero = require('./shared/rating-hero.es6.js')
const trackerNetworksIcon = require('./shared/tracker-network-icon.es6.js')
const trackerNetworksText = require('./shared/tracker-networks-text.es6.js')
const constants = require('../../../data/constants')

module.exports = function () {
    const tosdrMsg = (this.model.tosdr && this.model.tosdr.message) ||
        constants.tosdrMessages.unknown

    return bel`<div class="site-info site-info--main">
    <ul class="default-list">
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
        <li class="site-info__li--toggle js-site-protection-row padded ${this.model.protectionsEnabled ? 'is-active' : ''}">
            <p class="is-transparent site-info__whitelist-status js-site-whitelist-status">
                <span class="text-line-after-icon privacy-on-off-message bold">
                    ${setTransitionText(!this.model.isWhitelisted)}
                </span>
            </p>
            <p class="site-info__protection js-site-protection bold">Site Privacy Protection</p>
            <div class="site-info__toggle-container">
                ${toggleButton(this.model.protectionsEnabled, 'js-site-toggle pull-right')}
            </div>
        </li>
        <li class="js-site-manage-whitelist-li site-info__li--manage-whitelist padded ${this.model.displayBrokenUI ? 'is-hidden' : ''}">
            ${renderManageAllowlist(this.model)}
        </li>
        <li class="js-site-confirm-breakage-li site-info__li--confirm-breakage border--bottom padded is-hidden">
           <div class="js-site-confirm-breakage-message site-info__confirm-thanks is-transparent">
                <span class="site-info__message">
                    Thanks for the feedback!
                </span>
            </div>
            <div class="js-site-confirm-breakage site-info--confirm-breakage">
                <span class="site-info--is-site-broken bold">
                    Is this website broken?
                </span>
                <btn class="js-site-confirm-breakage-yes site-info__confirm-breakage-yes btn-pill">
                    Yes
                </btn>
                <btn class="js-site-confirm-breakage-no site-info__confirm-breakage-no btn-pill">
                    No
                </btn>
            </div>
        </li>
    </ul>
</div>`

    function setTransitionText (isSiteAllowlisted) {
        isSiteAllowlisted = isSiteAllowlisted || false
        let text = 'Added to Unprotected Sites'

        if (isSiteAllowlisted) {
            text = 'Removed from Unprotected Sites'
        }

        return text
    }

    function renderTrackerNetworks (model) {
        const isActive = model.protectionsEnabled ? 'is-active' : ''

        return bel`<a href="javascript:void(0)" class="site-info__trackers link-secondary bold">
    <span class="site-info__trackers-status__icon
        icon-${trackerNetworksIcon(model.siteRating, !model.protectionsEnabled, model.totalTrackerNetworksCount)}"></span>
    <span class="${isActive} text-line-after-icon"> ${trackerNetworksText(model, false)} </span>
    <span class="icon icon__arrow pull-right"></span>
</a>`
    }

    function renderManageAllowlist (model) {
        return bel`<div>
    <a href="javascript:void(0)" class="js-site-manage-whitelist site-info__manage-whitelist link-secondary bold">
        Unprotected Sites
    </a>
    <div class="separator"></div>
    <a href="javascript:void(0)" class="js-site-report-broken site-info__report-broken link-secondary bold">
        Report broken site
    </a>
</div>`
    }
}
