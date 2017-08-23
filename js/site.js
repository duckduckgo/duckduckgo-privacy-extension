/*
 * Each Site creates its own Score instance. The attributes
 * of the Score are updated as we process new events e.g. trackers
 * blocked or https status.
 *
 * The Score attributes are then used generate a site
 * privacy score used in the popup.
 */
const siteScores = ['A', 'B', 'C', 'D']

class Score {
    constructor(specialPage) {
        this.specialPage = specialPage;     // see specialDomain() in class Site below
        this.hasHTTPS = false;
        this.inMajorTrackingNetwork = false;
        this.totalBlocked = 0;
        this.hasObscureTracker = false;
    }

    /*
     * Calculates and returns a site score
     */
    get() {
        if (this.specialPage) return 'none';

        let scoreIndex = 1;

        if (this.inMajorTrackingNetwork) scoreIndex++
        if (this.hasHTTPS) scoreIndex--
        if (this.hasObscureTracker) scoreIndex++

        // decrease score for every 10, round up
        scoreIndex += Math.ceil(this.totalBlocked / 10)

        // return corresponding score or lowest score if outside the array
        return siteScores[scoreIndex] || siteScores[siteScores.length - 1];
    };

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

            this.totalBlocked++;
        }
    };
}

class Site {
    constructor(domain) {
        this.domain = domain,
        this.trackerUrls = [], // was this.trackers
        this.score = new Score(this.specialDomain());

        // whitelist only HTTPS upgrades
        this.HTTPSwhitelisted = false;

        // whitelist all privacy features
        this.whitelisted = false;

        this.setWhitelistStatusFromGlobal(domain);

        // set isSpecialDomain when the site is created. This value may be
        // updated later by the onComplete listener
        this.isSpecialDomain = this.specialDomain()

    }

    setWhitelisted(name, value){
        this[name] = value;
    };

    /*
     * Send message to the popup to rerender the whitelist
     */
    notifyWhitelistChanged () {
        chrome.runtime.sendMessage({'whitelistChanged': true});
    };

    isWhiteListed () { return this.whitelisted };

    addTracker (tracker) {
        if (this.trackerUrls.indexOf(tracker.url) === -1){
            this.trackerUrls.push(tracker.url);
            this.score.update({trackerBlocked: tracker, totalBlocked: this.trackerUrls.length});
        }
    };

    /*
     * When site objects are created we check the stored whitelists
     * and set the new site whitelist statuses
     */
    setWhitelistStatusFromGlobal(domain){
        let globalwhitelists = ['whitelisted', 'HTTPSwhitelisted'];

        globalwhitelists.map((name) => {
            let list = settings.getSetting(name) || {};
            this.setWhitelisted(name, list[this.domain]);
        });
    };

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
            return "extensions";

        if (this.domain === chrome.runtime.id)
            return "options";

        if (this.domain === 'newtab')
            return "new tab";

        // special case for about: firefox tabs
        if (browser === "moz" && !this.domain) {
            return "about";
        }

        return false;
    }
}
