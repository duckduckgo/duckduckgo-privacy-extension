class Score {
    constructor() {
        this.scoreIndex = 0;
        this.scoreExplination = {};
    }

    get() {
        let siteScores = ['A', 'B', 'C', 'D', 'F'];
        // return corresponding score or lowest score
        return siteScores[this.scoreIndex] || siteScores[siteScores.length - 1];
    };

    update(event) {
        let topTrackers = {Google:true, Facebook:true, Twitter:true, Amazon:true, AdNexus:true, Oracle:true}
        
        if (event.noHTTPS) { 
            this.scoreIndex++
            this.scoreExplination['noHTTPS'] = true;
        }
        else if (event.trackerBlocked) {
         
            if (topTrackers[event.trackerBlocked.parentCompany]) {
                this.scoreIndex++
                this.scoreExplination['topTracker'] = true;
            }

            // lower score for every 10 trackers
            if ((event.totalBlocked % 10) === 0){
                this.scoreIndex++
                this.scoreExplination['totalTrackers'] = ceil(event.totalBlocked/10)
            }

        }
    };

}

class Site{
    constructor(domain, scoreFunction) {
        this.domain = domain,
        this.trackers = [],
        this.score = null;
        this.scoreFunction = scoreFunction;
        this.setWhitelistStatusFromGlobal(domain);
        this.httpsWhitelisted = false;
        this.score = new Score();
    }

    setWhitelisted(value){ 
        this.whiteListed = value;
        this.setGlobalWhitelist();
    };

    setGlobalWhitelist(){
        let globalWhitelist = settings.getSetting('whitelist') || {};

        if(this.whiteListed){
            globalWhitelist[this.domain] = true;
        }
        else {
            delete globalWhitelist[this.domain];
        }

        settings.updateSetting('whitelist', globalWhitelist);
    };

    notifyWhitelistChanged(){
        chrome.runtime.sendMessage({'whitelistChanged': true});
    };

    isWhiteListed(){ return this.whiteListed };
    
    addTracker(tracker){ 
        if(this.trackers.indexOf(tracker.url) === -1){
            this.trackers.push(tracker.url);
            this.score.update({trackerBlocked: tracker, totalBlocked: this.trackers.length});
        }
    };

    setWhitelistStatusFromGlobal(domain){
        let globalWhitelist = settings.getSetting('whitelist') || {};

        if(globalWhitelist[this.domain]){
            this.setWhitelisted(true);
        }
        else{
            this.setWhitelisted(false);
        }
    };

    getTrackers(){ return this.trackers };

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
