require.scopes.trackerLists = ( function() {
    
    var lists = {
        trackersWithParentCompany: {}
    };

    function getLists() {
        return lists;
    }

    function setList(name, data) {
        lists[name] = data;
    }

    var exports = {
        getLists: getLists,
        setList: setList
    }
    return exports;
})();
