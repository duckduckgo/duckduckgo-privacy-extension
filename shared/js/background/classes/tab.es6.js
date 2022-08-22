/* This class contains information about what trackers and sites
 * are on a given tab:
 *  id: Chrome tab id
 *  url: url of the tab
 *  site: ref to a Site object
 *  trackers: {object} all trackers requested on page/tab (listed by company)
 *      is in this format:
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
const browserWrapper = require('../wrapper.es6')
const webResourceKeyRegex = /.*\?key=(.*)/
const { AdClickAttributionPolicy } = require('./ad-click-attribution-policy')
const { TabState } = require('./tab-state')

/** @typedef {{tabId: number, url: string | undefined, requestId?: string, status: string | null | undefined}} TabData */

class Tab {
    /**
     * @param {TabData} tabData
     */
    constructor (tabData) {
        /** @type {Record<string, Tracker>} */
        this.trackers = {}
        this._tabState = new TabState(tabData)

        this.site = new Site(this.url, this._tabState)
        this.httpsRedirects = new HttpsRedirects()
        this.resetBadgeIcon()
        this.webResourceAccess = []
        this.surrogates = {}

        /** @type {null | import('./ad-click-attribution-policy').AdClick} */
        this.adClick = null

        /** @type {null | import('../events/referrer-trimming').Referrer} */
        this.referrer = null
    }

    get url () {
        return this._tabState.url
    }

    set url (url) {
        this._tabState.url = url
        this._tabState.backup()
    }

    /**
     * @param {number} tabId
     */
    static async restore (tabId) {
        const state = await TabState.restore(tabId)
        if (!state) {
            return null
        }
        const tab = new Tab(state)
        tab._tabState = state
        return tab
    }

    static restoreFromTabStateData (serializedTabState) {
        const tabState = TabState.createFromSerialized(serializedTabState)
        if (!tabState) {
            return null
        }
        const tab = new Tab(tabState)
        tab._tabState = tabState
        return tab
    }

    get id () {
        return this._tabState.tabId
    }

    /**
     * @param {number} tabId
     */
    set id (tabId) {
        this._tabState.tabId = tabId
        this._tabState.backup()
    }

    get upgradedHttps () {
        return this._tabState.upgradedHttps
    }

    /**
     * @param {boolean} value
     */
    set upgradedHttps (value) {
        this._tabState.upgradedHttps = value
        this._tabState.backup()
    }

    get hasHttpsError () {
        return this._tabState.hasHttpsError
    }

    /**
     * @param {boolean} value
     */
    set hasHttpsError (value) {
        this._tabState.hasHttpsError = value
        this._tabState.backup()
    }

    get mainFrameUpgraded () {
        return this._tabState.mainFrameUpgraded
    }

    /**
     * @param {boolean} value
     */
    set mainFrameUpgraded (value) {
        this._tabState.mainFrameUpgraded = value
        this._tabState.backup()
    }

    get urlParametersRemoved () {
        return this._tabState.urlParametersRemoved
    }

    /**
     * @param {boolean} value
     */
    set urlParametersRemoved (value) {
        this._urlParametersRemoved = value
        this._tabState.backup()
    }

    get urlParametersRemovedUrl () {
        return this._tabState.urlParametersRemovedUrl
    }

    /**
     * @param {string | null} value
     */
    set urlParametersRemovedUrl (value) {
        this._tabState.urlParametersRemovedUrl = value
        this._tabState.backup()
    }

    get ampUrl () {
        return this._tabState.ampUrl
    }

    /**
     * @param {string | null} url
     */
    set ampUrl (url) {
        this._ampUrl = url
        this._tabState.backup()
    }

    get cleanAmpUrl () {
        return this._tabState.cleanAmpUrl
    }

    get requestId () {
        return this._tabState.requestId
    }

    /**
     * @param {string | null} url
     */
    set cleanAmpUrl (url) {
        this._cleanAmpUrl = url
        this._tabState.backup()
    }

    get status () {
        return this._tabState.status
    }

    set status (value) {
        this._tabState.status = value
        this._tabState.backup()
    }

    get statusCode () {
        return this._tabState.statusCode
    }

    set statusCode (value) {
        this._tabState.statusCode = value
        this._tabState.backup()
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
        this.site = new Site(url, this._tabState)

        // reset badge to dax whenever we go to a new site
        this.resetBadgeIcon()
    }

    // Store all trackers for a given tab even if we don't block them.
    addToTrackers (t) {
        const tracker = this.trackers[t.tracker.owner.name]

        if (tracker) {
            tracker.addTrackerUrl(t)
        } else if (t.tracker) {
            const newTracker = new Tracker(t)
            this.trackers[t.tracker.owner.name] = newTracker

            // first time we have seen this network tracker on the page
            if (t.tracker.owner.name !== 'unknown') Companies.countCompanyOnPage(t.tracker.owner)

            return newTracker
        }
    }

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
    }

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
