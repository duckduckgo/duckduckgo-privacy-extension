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
const browserWrapper = require('../$BROWSER-wrapper.es6')

class Site {
    constructor (url) {
        this.url = url || ''

        let domain = utils.extractHostFromURL(this.url) || ''
        domain = domain.toLowerCase()

        this.domain = domain
        this.trackerUrls = []
        this.grade = new Grade()
        this.whitelisted = false // user-whitelisted sites; applies to all privacy features
        this.whitelistOptIn = false
        this.setWhitelistStatusFromGlobal(domain)

        this.isBroken = utils.isBroken(domain) // broken sites reported to github repo
        this.isCanvasBroken = utils.isCanvasBroken(domain) // canvas issues reported to github repo
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

    /*
     * When site objects are created we check the stored whitelists
     * and set the new site whitelist statuses
     */
    setWhitelistStatusFromGlobal () {
        const globalwhitelists = ['whitelisted', 'whitelistOptIn']
        globalwhitelists.forEach((name) => {
            const list = settings.getSetting(name) || {}
            this.setWhitelisted(name, list[this.domain])
        })
    }

    setWhitelisted (name, value) {
        this[name] = value
    }

    /*
     * Send message to the popup to rerender the whitelist
     */
    notifyWhitelistChanged () {
        // this can send an error message when the popup is not open check lastError to hide it
        chrome.runtime.sendMessage({ whitelistChanged: true }, () => chrome.runtime.lastError)
    }

    isWhiteListed () { return this.whitelisted }

    addTracker (t) {
        if (this.trackerUrls.indexOf(t.tracker.domain) === -1) {
            this.trackerUrls.push(t.tracker.domain)
            const entityPrevalence = tdsStorage.tds.entities[t.tracker.owner.name].prevalence

            if (t.action.match(/block|redirect/)) {
                this.grade.addEntityBlocked(t.tracker.owner.name, entityPrevalence)
            } else {
                this.grade.addEntityNotBlocked(t.tracker.owner.name, entityPrevalence)
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
        const url = this.url
        const localhostName = 'localhost'
        let domain = this.domain

        if (url === '') {
            return 'new tab'
        }

        // Both 'localhost' and the loopback ip have to be specified
        // since they're treated as different domains
        if (domain === localhostName || domain.match(/^127\.0\.0\.1/)) {
            return localhostName
        }

        // Handle non-routable meta-address
        if (domain.match(/^0\.0\.0\.0/)) {
            return domain
        }

        // for some reason chrome passes this back from webNavigation events
        // for new tabs instead of chrome://newtab
        //
        // "local-ntp" -> "local new tab page"
        if (url.match(/^chrome-search:\/\/local-ntp/)) {
            return 'new tab'
        }

        // for special pages with a protocol, just return whatever
        // word comes after the protocol
        // e.g. 'chrome://extensions' -> 'extensions'
        if (url.match(/^chrome:\/\//) ||
                url.match(/^vivaldi:\/\//)) {
            if (domain === 'newtab') {
                domain = 'new tab'
            }

            return domain
        }

        // FF-style about: pages don't get their domains parsed properly
        // so just extract the bit after about:
        if (url.match(/^about:/)) {
            domain = url.match(/^about:([a-z-]+)/)[1]
            return domain
        }

        // extension pages
        if (url.match(/^(chrome|moz)-extension:\/\//)) {
            // this is our own extension, let's try and get a meaningful description
            if (domain === extensionId) {
                const matches = url.match(/^(?:chrome|moz)-extension:\/\/[^/]+\/html\/([a-z-]+).html/)

                if (matches && matches[1]) {
                    return matches[1]
                }
            }

            // if we failed, or this is not our extension, return a generic message
            return 'extension page'
        }

        return null
    }
}

module.exports = Site
