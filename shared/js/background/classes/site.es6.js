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
const abpLists = require('../abp-lists.es6')
const privacyPractices = require('../privacy-practices.es6')
const Grade = require('@duckduckgo/privacy-grade').Grade
const trackerPrevalence = require('../../../data/tracker_lists/prevalence')
const browserWrapper = require('../$BROWSER-wrapper.es6')
const tldjs = require('tldjs')

class Site {
    constructor (url) {
        this.url = url || ''

        let domain = utils.extractHostFromURL(this.url) || ''
        domain = domain.toLowerCase()

        this.domain = domain
        this.trackerUrls = []
        this.grade = new Grade()
        this.whitelisted = false // user-whitelisted sites; applies to all privacy features
        this.setWhitelistStatusFromGlobal(domain)
        this.isBroken = this.checkBrokenSites(domain) // broken sites reported to github repo
        this.didIncrementCompaniesData = false

        this.tosdr = privacyPractices.getTosdr(domain)

        this.parentEntity = utils.findParent(domain) || ''
        this.parentPrevalence = trackerPrevalence[this.parentEntity] || 0

        if (this.parentEntity && this.parentPrevalence) {
            this.grade.setParentEntity(this.parentEntity, this.parentPrevalence)
        }

        this.grade.setPrivacyScore(privacyPractices.getTosdrScore(domain))

        if (this.url.match(/^https:\/\//)) {
            this.grade.setHttps(true, true)
        }

        // set specialDomainName when the site is created
        this.specialDomainName = this.getSpecialDomain()
    }

    /*
     * check to see if this is a broken site reported on github
    */
    checkBrokenSites (domain) {
        let trackersWhitelistTemporary = abpLists.getTemporaryWhitelist()

        if (!trackersWhitelistTemporary) return

        // Match independently of subdomain
        domain = tldjs.getDomain(domain) || domain

        // Make sure we match at the end of the URL
        // so we're extra sure it's the legit main domain
        return trackersWhitelistTemporary.some(brokenSiteDomain => brokenSiteDomain.match(new RegExp(domain + '$')))
    }

    /*
     * When site objects are created we check the stored whitelists
     * and set the new site whitelist statuses
     */
    setWhitelistStatusFromGlobal () {
        let globalwhitelists = ['whitelisted']
        globalwhitelists.map((name) => {
            let list = settings.getSetting(name) || {}
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
        chrome.runtime.sendMessage({'whitelistChanged': true})
    }

    isWhiteListed () { return this.whitelisted }

    addTracker (tracker) {
        if (this.trackerUrls.indexOf(tracker.url) === -1) {
            this.trackerUrls.push(tracker.url)

            if (tracker.block) {
                this.grade.addEntityBlocked(tracker.parentCompany, tracker.prevalence)
            } else {
                this.grade.addEntityNotBlocked(tracker.parentCompany, tracker.prevalence)
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
                let matches = url.match(/^(?:chrome|moz)-extension:\/\/[^/]+\/html\/([a-z-]+).html/)

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
