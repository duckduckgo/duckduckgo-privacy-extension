var Sites = ( () => {
    var data = {};
    
    return {
        get: (domain) => { return data[domain] },

        add: (domain) => {
            if(!data[domain]){
                data[domain] = new Site(domain);
            }
            return data[domain];
        }
    };
})();
