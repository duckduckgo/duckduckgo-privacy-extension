const bel = require('bel')
const titleize = require('titleize')
const toggleButton = require('./shared/toggle-button.es6.js')
const siteRating = require('./shared/site-rating.es6.js')

module.exports = function () {

    return bel`<section class="site-info card">
        <ul class="default-list">
            <li class="site-info__rating-li">
                <div class="site-info__rating-container border--bottom">
                    <div class="site-info__rating-flex">
                        ${siteRating('A', this.model.siteRating === 'A')}
                        ${siteRating('B', this.model.siteRating === 'B')}
                        ${siteRating('C', this.model.siteRating === 'C')}
                        ${siteRating('D', this.model.siteRating === 'D')}
                        ${siteRating('F', this.model.siteRating === 'F')}
                    </div>
                    <h1 class="site-info__domain">${this.model.domain}</h1>
                    <p class="site-info__rating-label uppercase text--center">
                        Privacy Grade
                    </p>
                </div>
            </li>
            <li class="site-info__li--toggle padded border--bottom">
                <h2 class="site-info__protection">Site Privacy Protection</h2>
                <div class="site-info__toggle-container">
                    <span class="site-info__toggle-text">
                        ${this.model.whitelistStatusText}
                    </span>
                    ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right')}
                </div>
            </li>
            <li class="site-info__li--https-status padded border--bottom">
                <h2 class="site-info__https-status bold">
                    <span class="site-info__https-status__icon
                        is-${this.model.httpsState}">
                    </span>
                    Connection
                    <div class="float-right">
                        <span class="site-info__https-status__msg
                            is-${this.model.httpsStatusText.toLowerCase()}">
                            ${this.model.httpsStatusText}
                        </span>
                    </div>
                </h2>
            </li>
            <li class="site-info__li--trackers padded border--bottom">
                <h2 class="site-info__trackers bold">
                    <span class="site-info__trackers-status__icon
                        is-blocking--${!this.model.isWhitelisted}">
                    </span>
                    Tracker networks
                    <div class="float-right">
                        ${renderTrackerNetworks(
                            this.model.trackerNetworks,
                            this.model.numTrackerIconsToDisplay,
                            !this.model.isWhitelisted)}
                        ${renderNumOtherTrackerNetworks(
                            this.model.trackerNetworks
                        )}
                    </div>
                </h2>
            </li>
            <li class="site-info__li--more-details padded border--bottom">
                <a href="#" class="js-site-show-all-trackers link-secondary bold">
                    More details
                    <span class="icon icon__arrow pull-right"></span>
                </a>
            </li>
        </ul>
    </section>`

    function renderTrackerNetworks (tn, limit, isWhitelisted) {
        if (tn && tn.major) {
            const isActive = isWhitelisted ? 'is-active' : ''
            return tn.major.map((t, i) => {
                if (i > (limit - 1)) return ''
                return bel`<span class="site-info__tracker__icon
                    ${t.replace('.', '')} ${isActive}">${t}</span>`
            })
        }
    }

    function renderNumOtherTrackerNetworks (tn) {
        if (!tn) return
        let plus = ''
        if (tn.major && tn.major.length > 0) plus = '+'
        if (tn.numOthers) {
            return bel`<span class="site-info__trackers__others">
                ${plus} ${tn.numOthers}</span>`
        }
    }

    function trackersMsg (trackerNetworks, isWhitelisted) {
        const noTrackersMsg = `No tracker networks found on this page.`
        if (!trackerNetworks) {
            return bel`<span>${noTrackersMsg}</span>`
        }

        let msg = ``
        let isPlural = false
        if (trackerNetworks.major && trackerNetworks.major.length > 0) {
            if (trackerNetworks.major.length > 1) isPlural = true
            trackerNetworks.major.map((tn, i) => {
                msg += titleize(tn)
                if (isPlural && i < trackerNetworks.major.length - 1) msg += `,`
                msg += ` `
            })
            if (trackerNetworks.numOthers) {
                msg += `and ${trackerNetworks.numOthers} other`
                if (trackerNetworks.numOthers > 1) {
                    msg += `s`
                    isPlural = true
                }
                msg += ` `
            }
        } else if (trackerNetworks.numOthers) {
            msg = `${numOthers} network`
            if (trackerNetworks.numOthers.length > 1) {
                msg += `s`
                isPlural = true
            }
            msg += ` `
        }

        if (!msg) {
            return bel`<span>${noTrackersMsg}</span>`
        }

        const isOrAre = isPlural ? `are` : `is`
        if (isWhitelisted) {
            return bel`<span>${msg} ${isOrAre} <em>currently tracking</em> you.</span>`
        } else {
            return bel`<span>${msg} ${isOrAre} <em>blocked</em> from tracking you.</span>`
        }

    }
}
