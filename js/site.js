function Site(domain) {
    var domain = domain,
        trackers = [],
        score = null;
        whiteListed = false;
        
    return {
        whiteList: () => { whiteListed = true },

        isWhiteListed: () => { return whiteListed },

        addTracker: (tracker) => { 
            if(trackers.indexOf(tracker) === -1){
                trackers.push(tracker);
            }
        },

        getTrackers: () => { return trackers }

    }
}
