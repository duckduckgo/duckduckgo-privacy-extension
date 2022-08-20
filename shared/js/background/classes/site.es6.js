/**
 * Each Site creates its own Grade instance. The attributes
 * of the Grade are updated as we process new events e.g. trackers
 * blocked or https status.
 *
 * The Grade attributes are then used generate a site
 * privacy grade used in the popup.
 */
const settings = require('../settings.es6')
const utils = require('../utils.es6')
const tdsStorage = require('./../storage/tds.es6')
const privacyPractices = require('../privacy-practices.es6')
const Grade = require('@duckduckgo/privacy-grade').Grade
const browserWrapper = require('../wrapper.es6')

/**
 * @typedef {'allowlisted' | 'allowlistOptIn' | 'denylisted'} allowlistName
 */

class Site {
    constructor (url) {
        this.url = url || ''

        // Retain any www. prefix for our broken site lists
        let domainWWW = utils.extractHostFromURL(this.url, true) || ''
        domainWWW = domainWWW.toLowerCase()

        let domain = utils.extractHostFromURL(this.url) || ''
        domain = domain.toLowerCase()

        this.domain = domain
        this.protocol = this.url.substr(0, this.url.indexOf(':'))
        this.baseDomain = utils.getBaseDomain(url)
        this.trackerUrls = []
        this.grade = new Grade()
        this.allowlisted = false // user-allowlisted sites; applies to all privacy features
        this.allowlistOptIn = false
        this.denylisted = false
        this.setListStatusFromGlobal()

        /**
         * Broken site reporting relies on the www. prefix being present as a.com matches *.a.com
         * This would make the list apply to a much larger audience than is required.
         * The other allowlisting code is different and probably should be changed to match.
         */
        this.isBroken = utils.isBroken(domainWWW) // broken sites reported to github repo
        this._allowedFeatures = utils.getEnabledFeatures(domainWWW) // site issues reported to github repo
        this.didIncrementCompaniesData = false

        this.tosdr = privacyPractices.getTosdr(domain)

        this.parentEntity = utils.findParent(domain) || ''
        const parent = tdsStorage.tds.entities[this.parentEntity]
        this.parentPrevalence = parent ? parent.prevalence : 0

        if (this.parentEntity && this.parentPrevalence) {
            this.grade.setParentEntity(this.parentEntity, this.parentPrevalence)
        }

        this.grade.setPrivacyScore(privacyPractices.getTosdrScore(domain, parent))

        if (this.url.match(/^https:\/\//)) {
            this.grade.setHttps(true, true)
        }

        // set specialDomainName when the site is created
        this.specialDomainName = this.getSpecialDomain()
        // domains which have been clicked to load
        this.clickToLoad = []
    }

    /** @typedef {Site & { enabledFeatures: string[] }} SerializedSite */

    /**
     * @returns {SerializedSite}
     */
    clone () {
        // Typescript doesn't return the correct type for Object.assign, it's inclusive of the prototype chain which JS doesn't include
        /** @type {SerializedSite} */
        const out = Object.assign({}, this)
        out.enabledFeatures = this.enabledFeatures
        return out
    }

    get enabledFeatures () {
        return this._allowedFeatures.filter((feature) => this.isFeatureEnabled(feature))
    }

    /*
     * When site objects are created we check the stored lists
     * and set the new site list statuses
     */
    setListStatusFromGlobal () {
        /** @type {allowlistName[]} */
        const globalLists = ['allowlisted', 'allowlistOptIn', 'denylisted']
        globalLists.forEach((name) => {
            const list = settings.getSetting(name) || {}
            this.setListValue(name, list[this.domain])
        })
    }

    /**
     * @param {allowlistName} listName
     * @param {boolean} value
     */
    setListValue (listName, value) {
        this[listName] = value
    }

    /*
     * Send message to the popup to rerender the allowlist
     */
    notifyAllowlistChanged () {
        browserWrapper.notifyPopup({ allowlistChanged: true })
    }

    isContentBlockingEnabled () {
        return this.isFeatureEnabled('contentBlocking')
    }

    isProtectionEnabled () {
        if (this.denylisted) {
            return true
        }
        // Check if user has allowed disabled blocking or it's a known broken site.
        return !(this.allowlisted || this.isBroken)
    }

    /**
     * Checks different toggles we have in the application:
     * - User toggle off
     * - Remotely disable it
     *      - tempAllowlist
     *      - "status" check
     *      - "exceptions" check
     * - User toggle on
     */
    isFeatureEnabled (featureName) {
        const allowlistOnlyFeatures = ['autofill', 'adClickAttribution']
        if (allowlistOnlyFeatures.includes(featureName)) {
            return this._allowedFeatures.includes(featureName)
        }

        if (this.denylisted) {
            return true
        }
        return this.isProtectionEnabled() && this._allowedFeatures.includes(featureName)
    }

    /**
     * @param {import("../../../../node_modules/@duckduckgo/privacy-grade/src/classes/trackers").TrackerData} t
     */
    addTracker (t) {
        // Ignore trackers that aren't first party
        if (t.action === 'ignore' && !t.sameEntity) {
            return
        }
        if (t.tracker && this.trackerUrls.indexOf(t.tracker.domain) === -1) {
            this.trackerUrls.push(t.tracker.domain)
            const entityPrevalence = tdsStorage.tds.entities[t.tracker.owner.name]?.prevalence

            if (t.action) {
                if (['block', 'redirect', 'ignore-user'].includes(t.action)) {
                    this.grade.addEntityBlocked(t.tracker.owner.name, entityPrevalence)
                } else if (t.action === 'ignore') {
                    this.grade.addEntityNotBlocked(t.tracker.owner.name, entityPrevalence)
                }
            }
        }
    }

    /*
     * specialDomain
     *
     * determine if domain is a special page
     *
     * returns: a useable special page description string.
     *          or null if not a special page.
     */
    getSpecialDomain () {
        const extensionId = browserWrapper.getExtensionId()
        const localhostName = 'localhost'
        const { domain, protocol, url } = this

        if (url === '') {
            return 'new tab'
        }

        // Both 'localhost' and the loopback IP have to be specified
        // since they're treated as different domains.
        if (domain === localhostName || domain.match(/^127\.0\.0\.1/)) {
            return localhostName
        }

        // Handle non-routable meta-address.
        if (domain.match(/^0\.0\.0\.0/)) {
            return domain
        }

        // For special pages with a protocol, just return whatever word comes
        // after the protocol. E.g. 'chrome://extensions' becomes 'extensions'.
        if (protocol === 'about' ||
            protocol === 'chrome' ||
            protocol === 'chrome-search' ||
            protocol === 'vivaldi') {
            if (domain === 'newtab' || domain === 'local-ntp') {
                return 'new tab'
            }
            return domain
        }

        if (protocol === 'file') {
            return 'local file'
        }

        // Extension pages
        if (protocol === 'chrome-extension' || protocol === 'moz-extension') {
            // This is our own extension, let's try and get a meaningful
            // description.
            if (domain === extensionId) {
                const matches = url.match(/^(?:chrome|moz)-extension:\/\/[^/]+\/html\/([a-z-]+).html/)

                if (matches && matches[1]) {
                    return matches[1]
                }
            }

            // If we failed, or this is not our extension, return a generic message.
            return 'extension page'
        }

        // Our new tab page URL that is hard-coded in the Chromium source.
        // See https://source.chromium.org/chromium/chromium/src/+/main:components/search_engines/prepopulated_engines.json
        if (url === 'https://duckduckgo.com/chrome_newtab') {
            return 'new tab'
        }

        return null
    }
}

module.exports = Site
