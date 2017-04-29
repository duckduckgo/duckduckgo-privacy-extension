var Companies = ( () => {
    var data = {};
    var topBlocked = new TopBlocked(sortFunc);

    function sortFunc(a, b){
        return data[b].count - data[a].count;
    }

    return {
        get: (name) => { return data[name] },

        add: (name) => {
            if(!data[name]){
                data[name] = new Company(name);
                topBlocked.add(name);
            }
            data[name].incrementCount();
            return data[name];
        },

        all: () => { return Object.keys(data) },

        getTopBlocked: (n) => {
            return topBlocked.getTop(n);
        }
    };
})();
