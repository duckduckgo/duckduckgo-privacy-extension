/*
 * Each Site creates its own Score instance. The attributes
 * of the Score are updated as we process new events e.g. trackers
 * blocked or https status.
 *
 * The Score attributes are then used generate a site
 * privacy score used in the popup.
 */
var load = require('load')
var settings = require('settings')

let tosdr
let tosdrRegexList
let tosdrListLoaded
let trackersWhitelistTemporary

settings.ready().then(() => {
    load.JSONfromLocalFile(settings.getSetting('tosdr'),(data) => {
        tosdr = data
        tosdrRegexList = Object.keys(tosdr).map(x => new RegExp(x))
        tosdrListLoaded = true
    })
})

const siteScores = ['A', 'B', 'C', 'D']

// percent of the top 500 sites a major tracking network is seen on
const pagesSeenOn = {'google':55,'amazon':23,'facebook':20,'comscore':19,'twitter':11,'criteo':9,'quantcast':9,'adobe':8,'newrelic':7,'appnexus':7}
const pagesSeenOnRegexList = Object.keys(pagesSeenOn).map(x => new RegExp(`${x}\\.`))
const tosdrClassMap = {'A': -1, 'B': 0, 'C': 0, 'D': 1, 'E': 2} // map tosdr class rankings to increase/decrease in grade

class Score {

    constructor(specialPage, domain) {
        this.specialPage = specialPage     // see specialDomain() in class Site below
        this.hasHTTPS = false
        this.inMajorTrackingNetwork = false
        this.totalBlocked = 0
        this.hasObscureTracker = false
        this.domain = domain
        this.isaMajorTrackingNetwork = this.isaMajorTrackingNetwork()
        this.tosdr = this.getTosdr()
    }

    getTosdr() {
        let result = {}

        // return if the list hasn't been built yet
        if (!tosdrListLoaded) return result

        tosdrRegexList.some(tosdrSite => {
            let match = tosdrSite.exec(this.domain)
            if (match) {
                // remove period at end for lookup in pagesSeenOn
                let tosdrData = tosdr[match[0]]

                return result = {
                    score: tosdrData.score,
                    class: tosdrData.class,
                    reasons: tosdrData.match
                }
            }
        })
        return result
    }

    /* is the parent site itself a major tarcking network?
     * minus one grade for each 10% of the top pages this
     * network is found on.
     */
    isaMajorTrackingNetwork() {
        let result = 0
        pagesSeenOnRegexList.some(network => {
            let match = network.exec(this.domain)
            if (match) {
                // remove period at end for lookup in pagesSeenOn
                let name = match[0].slice(0,-1)
                return result = Math.ceil(pagesSeenOn[name] / 10)
            }
        })
        return result
    }

    /*
     * Calculates and returns a site score
     */
    get() {
        if (this.specialPage) return 'none'

        let beforeIndex = 1
        let afterIndex = 1

        if (this.isaMajorTrackingNetwork) {
            beforeIndex += this.isaMajorTrackingNetwork
            afterIndex += this.isaMajorTrackingNetwork
        }
        
        // If tosdr already determined a class ranking then we map that to increase or
        // decrease the grade accordingly. Otherwise we apply a +/- to the grade based
        // on the cumulative total of all the points we care about. see: scripts/tosdr-topics.json
        if (this.tosdr) {
            if (this.tosdr.class) {
                beforeIndex += tosdrClassMap[this.tosdr.class]
                afterIndex += tosdrClassMap[this.tosdr.class]

            } else if (this.tosdr.score) {
                let tosdrScore =  Math.sign(this.tosdr.score)
                beforeIndex += tosdrScore

                // only apply a positive tosdr score
                if (tosdrScore > 0) {
                    afterIndex += tosdrScore
                }
            }
        }

        if (this.inMajorTrackingNetwork) beforeIndex++
        if (!this.hasHTTPS) {
            beforeIndex++
            afterIndex++
        }

        if (this.hasObscureTracker) beforeIndex++

        // decrease score for every 10, round up
        beforeIndex += Math.ceil(this.totalBlocked / 10)

        // negative scoreIndex should return the highest score
        if (beforeIndex < 0) beforeIndex = 0
        if (afterIndex < 0) afterIndex = 0

        // return corresponding score or lowest score if outside the array
        let beforeGrade = siteScores[beforeIndex] || siteScores[siteScores.length - 1]
        let afterGrade = siteScores[afterIndex] || siteScores[siteScores.length - 1]

        return {before: beforeGrade, after: afterGrade}
    }

    /*
     * Update the score attruibues as new events come in. The actual
     * site score is calculated later when you call .get()
     */
    update(event) {

        let majorTrackingNetworks = settings.getSetting('majorTrackingNetworks')
        let IPRegex = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/

        if (event.hasHTTPS) {
            this.hasHTTPS = true
        }
        else if (event.trackerBlocked) {

            // tracker is from one of the top blocked companies
            if (majorTrackingNetworks[event.trackerBlocked.parentCompany]) {
                this.inMajorTrackingNetwork = true
            }

            // trackers with IP address
            if (event.trackerBlocked.url.match(IPRegex)) {
                this.hasObscureTracker = true
            }

            this.totalBlocked++
        }
    }
}

class Site {
    constructor(domain) {
        if (domain) domain = domain.toLowerCase()
        this.domain = domain,
        this.trackerUrls = [],
        this.score = new Score(this.specialDomain(), this.domain);
        this.HTTPSwhitelisted = false; // when forced https upgrades create mixed content situations
        this.whitelisted = false; // user-whitelisted sites; applies to all privacy features
        this.setWhitelistStatusFromGlobal(domain);
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
    setWhitelistStatusFromGlobal(){
        let globalwhitelists = ['whitelisted', 'HTTPSwhitelisted']

        globalwhitelists.map((name) => {
            let list = settings.getSetting(name) || {}
            this.setWhitelisted(name, list[this.domain])
        })
    }

    setWhitelisted(name, value){
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

        if (browser === 'moz' && !this.domain) {
            return 'new tab'
        }

        return false
    }
}
