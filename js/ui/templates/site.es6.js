const bel = require('bel')
const toggleButton = require('./shared/toggle-button')
const popover = require('./shared/popover.es6.js')

module.exports = function () {

    return bel`<section class="site-info card">
        <ul class="default-list">
            <li class="padded">
                <h1 class="site-info__domain">${this.model.domain}</h1>
                <div class="site-info__toggle-container">
                    <span class="site-info__toggle-text">${this.model.whitelistStatusText}</span>
                    ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right')}  
                </div>              
            </li>
            <li class="site-info__rating-li">
                <div class="site-info__rating-container">
                    <p class="site-info__rating-label">Privacy Grade</p>
                    <div class="site-info__rating-flex">
                        ${renderSiteRating('A', this.model.siteRating)}
                        ${renderSiteRating('B', this.model.siteRating)}
                        ${renderSiteRating('C', this.model.siteRating)}
                        ${renderSiteRating('D', this.model.siteRating)}
                    </div>
                    ${renderUserPrivacyMsg(this.model.isUserPrivacyUpgraded)}
                </div>
            </li>
            <li class="site-info__li--https-status padded">
                <h2 class="site-info__https-status">
                    Connection
                    <div class="float-right">
                        <span class="site-info__https-status__msg 
                            ${this.model.httpsStatusText.toLowerCase()}">
                            ${this.model.httpsStatusText}
                        </span>
                        <span class="site-info__https-status__icon 
                            site-info__https-status__icon--${this.model.httpsState}">
                        </span>
                    </div>
                </h2>
                ${popover(
                    'site_info__https-status__popover',
                    httpsMsg(this.model.httpsState)
                )}
            </li>
            <li class="site-info__li--trackers padded border--bottom">
                <h2 class="site-info__trackers">
                    Tracker networks
                    <div class="float-right">
                        ${renderTrackerNetworks(this.model.trackerNetworks, !this.model.isWhitelisted)}
                        ${renderNumOtherTrackerNetworks(this.model.trackerNetworks)}
                    </div>
                </h2>
                ${popover(
                    'site_info__trackers__popover',
                    trackersMsg(this.model.trackerNetworks)
                )}
            </li>
            <li class="site-info__li--more-details padded border--bottom">
                <a href="#" class="js-site-show-all-trackers link-secondary bold">
                    More details
                    <span class="icon icon__arrow pull-right"></span>
                </a>
            </li>
        </ul>
    </section>`

    function renderSiteRating (letter, siteRating) {
        const isActive = siteRating === letter ? 'is-active' : ''
        return bel`<div 
            class="site-info__rating site-info__rating--${letter.toLowerCase()} 
            ${isActive}">
                ${letter}
            </div>`
    }

    function httpsMsg (httpsState) {
        return `foo https msg sldkfl ghhg sdkdk dkdkdk dkdkdkd kdkd d dkd dd`
    }

    function trackersMsg (trackerNetworks) {
        return `foo trackers msg`
    }

    function renderTrackerNetworks (trackerNetworks, isWhitelisted) {
        if (trackerNetworks && trackerNetworks.major) {
            const isActive = isWhitelisted ? 'is-active' : ''
            return trackerNetworks.major.map((tn) => {
                return bel`<span class="site-info__tracker__icon 
                    ${tn.replace('.', '')} ${isActive}">${tn}</span>`
            })
        }
    }

    function renderNumOtherTrackerNetworks (trackerNetworks) {
        if (trackerNetworks && trackerNetworks.numOthers) {
            return bel`<span class="site-info__trackers__others">
                + ${trackerNetworks.numOthers}</span>`
        }
    }

    function renderUserPrivacyMsg (upgraded) {
        if (upgraded) {
            return bel`<p class="site-info__user-privacy-msg">
               ...but we have 
               <span class="is-upgraded">improved the site!</span>
               </p>`
        } else {
            return bel`<p class="site-info__user-privacy-msg">
                ...for the <span>following reasons:</span></p>`
        }
    }
}
