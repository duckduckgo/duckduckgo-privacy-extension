class Site{
    constructor(domain) {
        this.domain = domain,
        this.trackers = [],
        this.score = null;
        this.whiteListed = false;
        
        this.calculateSiteScore = function(){
            this.score = this.trackers.length;
        }

    }
    whiteList(){ this.whiteListed = true };
    
    isWhiteListed(){ return this.whiteListed };
    
    addTracker(tracker){ 
        if(this.trackers.indexOf(tracker) === -1){
            this.trackers.push(tracker);
        }
    };

    getScore(){
        this.calculateSiteScore();
        return this.score;
    }

    getTrackers(){ return this.trackers };

    setTrackers(newTrackers){ this.trackers = newTrackers };
    setScore(newScore){ this.score = newScore };
    setWhiteList(newWhitelisted){ this.whiteListed = newWhitelisted };

}
