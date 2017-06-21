class Site{
    constructor(domain) {
        this.domain = domain,
        this.trackers = [],

        // whitelist only HTTPS upgrades
        this.HTTPSwhitelisted = false;

        // whitelist all privacy features
        this.whitelisted = false;

        this.setWhitelistStatusFromGlobal(domain);
    }

    setWhitelisted(name, value){ 
        this[name] = value;
        this.setGlobalWhitelist(name);
    };

    /*
     * Store an updated whitelist value in settings
     */
    setGlobalWhitelist(name){
        let globalwhitelist = settings.getSetting(name) || {};

        if(this[name]){
            globalwhitelist[this.domain] = true;
        }
        else {
            delete globalwhitelist[this.domain];
        }

        settings.updateSetting(name, globalwhitelist);
    };

    /*
     * Send message to the popup to rerender the whitelist
     */
    notifyWhitelistChanged(){
        chrome.runtime.sendMessage({'whitelistChanged': true});
    };

    isWhiteListed(){ return this.whitelisted };
    
    addTracker(tracker){ 
        if(this.trackers.indexOf(tracker) === -1){
            this.trackers.push(tracker);
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

    getTrackers(){ return this.trackers };
    setTrackers(newTrackers){ this.trackers = newTrackers };

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

        return false;
    }
}
