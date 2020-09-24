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
        <li class="site-info__li--https-status padded border--bottom">
            <h2 class="site-info__https-status bold">
                <span class="site-info__https-status__icon
                    is-${this.model.httpsState}">
                </span>
                <span class="text-line-after-icon">
                    ${this.model.httpsStatusText}
                </span>
            </h2>
        </li>
        <li class="js-site-tracker-networks js-site-show-page-trackers site-info__li--trackers padded border--bottom">
            <a href="javascript:void(0)" class="link-secondary bold">
                ${renderTrackerNetworks(this.model)}
            </a>
        </li>
        <li class="js-site-privacy-practices site-info__li--privacy-practices padded border--bottom">
            <span class="site-info__privacy-practices__icon
                is-${tosdrMsg.toLowerCase()}">
            </span>
            <a href="javascript:void(0)" class="link-secondary bold">
                <span class="text-line-after-icon"> ${tosdrMsg} Privacy Practices </span>
                <span class="icon icon__arrow pull-right"></span>
            </a>
        </li>
        <li class="site-info__li--toggle padded ${this.model.isWhitelisted ? '' : 'is-active'}">
            <h2 class="is-transparent site-info__whitelist-status js-site-whitelist-status">
                <span class="text-line-after-icon privacy-on-off-message">
                    ${setTransitionText(!this.model.isWhitelisted)}
                </span>
            </h2>
            <h2 class="site-info__protection js-site-protection">Site Privacy Protection</h2>
            <div class="site-info__toggle-container">
                ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right')}
            </div>
        </li>
        <li class="js-site-manage-whitelist-li site-info__li--manage-whitelist padded">
            ${renderManageWhitelist(this.model)}
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

    function setTransitionText (isSiteWhitelisted) {
        isSiteWhitelisted = isSiteWhitelisted || false
        let text = 'Added to Unprotected Sites'

        if (isSiteWhitelisted) {
            text = 'Removed from Unprotected Sites'
        }

        return text
    }

    function renderTrackerNetworks (model) {
        const isActive = !model.isWhitelisted ? 'is-active' : ''

        return bel`<a href="javascript:void(0)" class="site-info__trackers link-secondary bold">
    <span class="site-info__trackers-status__icon
        icon-${trackerNetworksIcon(model.siteRating, model.isWhitelisted, model.totalTrackerNetworksCount)}"></span>
    <span class="${isActive} text-line-after-icon"> ${trackerNetworksText(model, false)} </span>
    <span class="icon icon__arrow pull-right"></span>
</a>`
    }

    function renderManageWhitelist (model) {
        return bel`<div>
    <a href="javascript:void(0)" class="js-site-manage-whitelist site-info__manage-whitelist link-secondary bold">
        Unprotected Sites
    </a>
    <div class="separator"></div>
    <a href="javascript:void(0)" class="js-site-report-broken site-info__report-broken link-secondary bold">
        Report Broken Site
    </a>
</div>`
    }
}
