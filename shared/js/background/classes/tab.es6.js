/* This class contains information about what trackers and sites
 * are on a given tab:
 *  id: Chrome tab id
 *  url: url of the tab
 *  site: ref to a Site object
 *  trackers: {object} all trackers requested on page/tab (listed by company)
 *  trackersBlocked: {object} tracker instances we blocked on page/tab (listed by company)
 *      both `trackers` and `trackersBlocked` objects are in this format:
 *      {
 *         '<companyName>': {
 *              parentCompany: ref to a Company object
 *              urls: all unique tracker urls we have seen for this company
 *              count: total number of requests to unique tracker urls for this company
 *          }
 *      }
 */
const gradeIconLocations = {
    A: '/img/toolbar-rating-a_48.png',
    'B+': '/img/toolbar-rating-b-plus_48.png',
    B: '/img/toolbar-rating-b_48.png',
    'C+': '/img/toolbar-rating-c-plus_48.png',
    C: '/img/toolbar-rating-c_48.png',
    D: '/img/toolbar-rating-d_48.png',
    // we don't currently show the D- grade
    'D-': '/img/toolbar-rating-d_48.png',
    F: '/img/toolbar-rating-f_48.png'
}

const Site = require('./site.es6')
const { Tracker } = require('./tracker')
const HttpsRedirects = require('./https-redirects.es6')
const Companies = require('../companies.es6')
const browserWrapper = require('./../wrapper.es6')
const webResourceKeyRegex = /.*\?key=(.*)/
const { AdClickAttributionPolicy } = require('./ad-click-attribution-policy')

/** @typedef {Tab & { site: ReturnType<Tab['site']['clone']> }} SerializedTab */

class Tab {
    constructor (tabData) {
        this.id = tabData.id || tabData.tabId
        /** @type {Record<string, Tracker>} */
        this.trackers = {}
        this.trackersBlocked = {}
        this.url = tabData.url
        this.upgradedHttps = false
        this.hasHttpsError = false
        this.mainFrameUpgraded = false
        this.urlParametersRemoved = false
        this.urlParametersRemovedUrl = null
        this.ampUrl = null
        this.cleanAmpUrl = null
        this.requestId = tabData.requestId
        this.status = tabData.status
        this.site = new Site(this.url)
        this.httpsRedirects = new HttpsRedirects()
        this.statusCode = null // statusCode is set when headers are recieved in tabManager.js
        /** @type {{begin: number, end: number?, completeMs: number?}} */
        this.stopwatch = {
            begin: Date.now(),
            end: null,
            completeMs: null
        }
        this.resetBadgeIcon()
        this.webResourceAccess = []
        this.surrogates = {}

        /** @type {null | import('./ad-click-attribution-policy').AdClick} */
        this.adClick = null
    }

    /**
     * @returns {SerializedTab}
     */
    clone () {
        const out = Object.assign({}, this)
        out.site = this.site.clone()
        return out
    }

    /**
     * If given a valid adClick redirect, set the adClick to the tab.
     * @param {*} request
     * @param {string} tabDomain
     */
    setAdClickIfValidRedirect (request, tabDomain) {
        const policy = this.getAdClickAttributionPolicy()
        const adClick = policy.createAdClick(request.url, this)
        if (adClick) {
            this.adClick = adClick
        }
    }

    /**
     * @returns {AdClickAttributionPolicy}
     */
    getAdClickAttributionPolicy () {
        this._adClickAttributionPolicy = this._adClickAttributionPolicy || new AdClickAttributionPolicy()
        return this._adClickAttributionPolicy
    }

    /**
     * Returns true if a resource should be permitted when the tab is in the adClick state.
     * @param {string} resourcePath
     * @returns {boolean}
     */
    allowAdAttribution (resourcePath) {
        if (!this.site.isFeatureEnabled('adClickAttribution') || !this.adClick || !this.adClick.allowAdAttribution(this)) return false
        const policy = this.getAdClickAttributionPolicy()
        return policy.resourcePermitted(resourcePath)
    }

    resetBadgeIcon () {
        // set the new tab icon to the dax logo
        browserWrapper.setBadgeIcon({ path: '/img/icon_48.png', tabId: this.id })
    }

    updateBadgeIcon (target) {
        if (this.site.specialDomainName) return
        let gradeIcon
        const grade = this.site.grade.get()

        if (this.site.isContentBlockingEnabled()) {
            gradeIcon = gradeIconLocations[grade.enhanced.grade]
        } else {
            gradeIcon = gradeIconLocations[grade.site.grade]
        }

        const badgeData = { path: gradeIcon, tabId: this.id }
        if (target) badgeData.target = target

        browserWrapper.setBadgeIcon(badgeData)
    }

    updateSite (url) {
        if (this.site.url === url) return

        this.url = url
        this.site = new Site(url)

        // reset badge to dax whenever we go to a new site
        this.resetBadgeIcon()
    };

    // Store all trackers for a given tab even if we don't block them.
    addToTrackers (t) {
        const tracker = this.trackers[t.tracker.owner.name]

        if (tracker) {
            tracker.addTrackerUrl(t)
        } else {
            const newTracker = new Tracker(t)
            this.trackers[t.tracker.owner.name] = newTracker

            // first time we have seen this network tracker on the page
            if (t.tracker.owner.name !== 'unknown') Companies.countCompanyOnPage(t.tracker.owner)

            return newTracker
        }
    };

    addOrUpdateTrackersBlocked (t) {
        const tracker = this.trackersBlocked[t.tracker.owner.name]
        if (tracker) {
            tracker.addTrackerUrl(t)
        } else {
            const newTracker = new Tracker(t)
            this.trackersBlocked[newTracker.parentCompany.name] = newTracker
            return newTracker
        }
    };

    endStopwatch () {
        this.stopwatch.end = Date.now()
        this.stopwatch.completeMs = (this.stopwatch.end - this.stopwatch.begin)
        console.log(`tab.status: complete. site took ${this.stopwatch.completeMs / 1000} seconds to load.`)
    };

    /**
     * Adds an entry to the tab webResourceAccess list.
     * @param {string} resourceName URL to the web accessible resource
     * @returns {string} generated access key
     **/
    addWebResourceAccess (resourceName) {
        // random 8-9 character key for web resource access
        const key = Math.floor(Math.random() * 10000000000).toString(16)
        this.webResourceAccess.push({ key, resourceName, time: Date.now(), wasAccessed: false })
        return key
    };

    /**
     * Access to web accessible resources needs to have the correct key passed in the URL
     * and the requests needs to happen within 1 second since the generation of the key
     * in addWebResourceAccess
     * @param {string} resourceURL web accessible resource URL
     * @returns {boolean} is access to the resource allowed
     **/
    hasWebResourceAccess (resourceURL) {
        // no record of web resource access for this tab
        if (!this.webResourceAccess.length) {
            return false
        }

        const keyMatches = webResourceKeyRegex.exec(resourceURL)
        if (!keyMatches) {
            return false
        }

        const key = keyMatches[1]
        const hasAccess = this.webResourceAccess.some(resource => {
            if (resource.key === key && !resource.wasAccessed) {
                resource.wasAccessed = true
                if ((Date.now() - resource.time) < 1000) {
                    return true
                }
            }
            return false
        })

        return hasAccess
    }

    /**
     * This method sets ampUrl. In cases where ampUrl is already set with an AMP url and the new url is
     * contained in the current ampUrl, we don't want to set ampUrl to the new url. This is because in some cases
     * simple amp urls (e.g. google.com/amp) will contain another amp url as the extacted url.
     *
     * @param {string} url - the url to set ampUrl to
     */
    setAmpUrl (url) {
        if (this.ampUrl) {
            const ampUrl = new URL(this.ampUrl)
            const newUrl = new URL(url)
            if (ampUrl.hostname.includes('google') && ampUrl.pathname.includes(newUrl.hostname)) {
                return
            }
        }

        this.ampUrl = url
    }
}

module.exports = Tab
