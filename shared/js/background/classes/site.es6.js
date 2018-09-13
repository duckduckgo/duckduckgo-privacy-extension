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
const Grade = require('privacy-grade').Grade
const trackerPrevalence = require('../../../data/tracker_lists/prevalence')

class Site {
    constructor (domain) {
        if (domain) domain = domain.toLowerCase()
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

        // set isSpecialDomain when the site is created. This value may be
        // updated later by the onComplete listener
        this.isSpecialDomain = this.specialDomain()
    }

    /*
     * check to see if this is a broken site reported on github
    */
    checkBrokenSites (domain) {
        let trackersWhitelistTemporary = abpLists.getTemporaryWhitelist()

        if (!trackersWhitelistTemporary) {

        } else {
            return trackersWhitelistTemporary.indexOf(domain) !== -1
        }
    };

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
     *          or false if not a special page.
     */
    specialDomain () {
        if (this.domain === 'extensions') { return 'extensions' }

        if (window.chrome && this.domain === chrome.runtime.id) { return 'options' }

        if (this.domain === 'newtab') { return 'new tab' }

        if (this.domain === 'about') {
            return 'about'
        }

        if (utils.getBrowserName() === 'moz' && !this.domain) {
            return 'new tab'
        }

        return false
    }
}

module.exports = Site
