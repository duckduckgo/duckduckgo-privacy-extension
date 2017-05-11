class Site{
    constructor(domain, scoreFunction) {
        this.domain = domain,
        this.trackers = [],
        this.score = null;
        this.scoreFunction = scoreFunction;
        this.setWhitelistStatusFromGlobal(domain)
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
        chrome.runtime.sendMessage({'rerenderWhitelist': true});
    };

    isWhiteListed(){ return this.whiteListed };
    
    addTracker(tracker){ 
        if(this.trackers.indexOf(tracker) === -1){
            this.trackers.push(tracker);
        }
    };

    getScore(){
        this.score = this.scoreFunction();
        return this.score;
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
    setTrackers(newTrackers){ this.trackers = newTrackers };
    setScore(newScore){ this.score = newScore };
}
