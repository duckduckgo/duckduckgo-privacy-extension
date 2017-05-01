class Site{
    constructor(domain) {
        this.domain = domain,
        this.trackers = [],
        this.score = null;
        this.whiteListed = false;
    }
    whiteList(){ this.whiteListed = true };
    
    isWhiteListed(){ return this.whiteListed };
    
    addTracker(tracker){ 
        if(this.trackers.indexOf(tracker) === -1){
            this.trackers.push(tracker);
        }
    };
    
    getTrackers(){ return this.trackers };

    setTrackers(newTrackers){ this.trackers = newTrackers };
    setScore(newScore){ this.score = newScore };
    setWhiteList(newWhitelisted){ this.whiteListed = newWhitelisted };

}
