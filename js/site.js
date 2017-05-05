class Site{
    constructor(domain, scoreFunction) {
        this.domain = domain,
        this.trackers = [],
        this.score = null;
        this.whiteListed = this._checkGlobalWhitelist(domain);
        this.scoreFunction = scoreFunction;
    }

    setWhitelisted(value){ 
        this.whiteListed = value;
        let globalWhitelist = settings.getSetting('whitelist');

        if(!globalWhitelist){
            globalWhitelist = [];
        }

        var index = globalWhitelist.indexOf(this.domain);
        
        // add to settings whitelist
        if(index === -1 && value === true){
            globalWhitelist.push(this.domain);
        }
        // remove from settings whitelist
        else if(index !== -1 && value === false){
            globalWhitelist.splice(index, 1);
        }
        settings.updateSetting('whitelist', globalWhitelist);
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

    _checkGlobalWhitelist(domain){
        let globalWhitelist = settings.getSetting('whitelist');
        if(globalWhitelist && globalWhitelist.indexOf(domain) !== -1){
            return true;
        }
        return false;
    };

    getTrackers(){ return this.trackers };
    setTrackers(newTrackers){ this.trackers = newTrackers };
    setScore(newScore){ this.score = newScore };
}
