/**
 * Each Site creates its own Grade instance. The attributes
 * of the Grade are updated as we process new events e.g. trackers
 * blocked or https status.
 *
 * The Grade attributes are then used generate a site
 * privacy grade used in the popup.
 */
const settings = require('../settings')
const utils = require('../utils')
const tdsStorage = require('./../storage/tds').default
const privacyPractices = require('../privacy-practices')
const Grade = require('@duckduckgo/privacy-grade').Grade
const browserWrapper = require('../wrapper')
const { TabState } = require('./tab-state')

/**
 * @typedef {'allowlisted' | 'allowlistOptIn' | 'denylisted'} allowlistName
 */

class Site {
    constructor (url, tabState) {
        // If no tabState is passed in then we create a new one to simulate a new tab
        if (!tabState) {
            tabState = new TabState({ tabId: 1, url, status: 'complete' })
        }
        this.url = url || ''
        /** @type {TabState} */
        this._tabState = tabState
        this.trackerUrls = []
        this.grade = new Grade()
        this.setListStatusFromGlobal()

        this.didIncrementCompaniesData = false

        this.tosdr = privacyPractices.getTosdr(this.domain)

        if (this.parentEntity && this.parentPrevalence) {
            this.grade.setParentEntity(this.parentEntity, this.parentPrevalence)
        }

        if ('parent' in globalThis) {
            this.grade.setPrivacyScore(privacyPractices.getTosdrScore(this.domain, parent))
        }

        if (this.url.match(/^https:\/\//)) {
            this.grade.setHttps(true, true)
        }

        // set specialDomainName when the site is created
        this.specialDomainName = this.getSpecialDomain()
    }

    get allowlisted () {
        return this._tabState.allowlisted
    }

    set allowlisted (value) {
        this._tabState.setValue('allowlisted', value)
    }

    get allowlistOptIn () {
        return this._tabState.allowlistOptIn
    }

    set allowlistOptIn (value) {
        this._tabState.setValue('allowlistOptIn', value)
    }

    get denylisted () {
        return this._tabState.denylisted
    }

    set denylisted (value) {
        this._tabState.setValue('denylisted', value)
    }

    /**
     * Broken site reporting relies on the www. prefix being present as a.com matches *.a.com
     * This would make the list apply to a much larger audience than is required.
     * The other allowlisting code is different and probably should be changed to match.
     */
    get isBroken () {
        return utils.isBroken(this.domainWWW) // broken sites reported to github repo
    }

    get enabledFeatures () {
        return utils.getEnabledFeatures(this.domainWWW) // site issues reported to github repo
    }

    get domain () {
        const domain = utils.extractHostFromURL(this.url) || ''
        return domain.toLowerCase()
    }

    get domainWWW () {
        // Retain any www. prefix for our broken site lists
        const domainWWW = utils.extractHostFromURL(this.url, true) || ''
        return domainWWW.toLowerCase()
    }

    get protocol () {
        return this.url.substr(0, this.url.indexOf(':'))
    }

    get baseDomain () {
        return utils.getBaseDomain(this.url)
    }

    get parentEntity () {
        return utils.findParent(this.domain) || ''
    }

    get parentPrevalence () {
        const parent = tdsStorage.tds.entities[this.parentEntity]
        return parent ? parent.prevalence : 0
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
        if (value === true || value === false) {
            this[listName] = value
        }
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
            return this.enabledFeatures.includes(featureName)
        }

        if (this.denylisted) {
            return true
        }
        return this.isProtectionEnabled() && this.enabledFeatures.includes(featureName)
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
