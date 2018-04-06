/**
 * Each Site creates its own Score instance. The attributes
 * of the Score are updated as we process new events e.g. trackers
 * blocked or https status.
 *
 * The Score attributes are then used generate a site
 * privacy score used in the popup.
 */
const load = require('../load.es6')
const settings = require('../settings.es6')
const Score = require('./score.es6')
const utils = require('../utils.es6')
const abpLists = require('../abp-lists.es6')

class Site {
    constructor(domain) {
        if (domain) domain = domain.toLowerCase()
        this.domain = domain,
        this.trackerUrls = [],
        this.score = new Score(this.specialDomain(), this.domain);
        this.whitelisted = false; // user-whitelisted sites; applies to all privacy features
        this.setWhitelistStatusFromGlobal(domain);
        this.requests = []
        this.isBroken = this.checkBrokenSites(domain); // broken sites reported to github repo
        this.didIncrementCompaniesData = false;

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
             return
         } else {
             return trackersWhitelistTemporary.indexOf(domain) !== -1 ? true : false
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
        if (this.trackerUrls.indexOf(tracker.url) === -1){
            this.trackerUrls.push(tracker.url)
            this.score.update({trackerBlocked: tracker, totalBlocked: this.trackerUrls.length})
        }
    }

    addRequest (request) {
        this.requests.push(request)
    }

    /*
     * specialDomain
     *
     * determine if domain is a special page
     *
     * returns: a useable special page description string.
     *          or false if not a special page.
     */
    specialDomain() {
        if (this.domain === 'extensions')
            return 'extensions'

        if (this.domain === chrome.runtime.id)
            return 'options'

        if (this.domain === 'newtab')
            return 'new tab'

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
