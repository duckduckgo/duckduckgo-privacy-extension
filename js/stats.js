require.scopes.stats = ( () => {
    var utils = require('utils');

    function getTopBlocked(){
        var list = Companies.getTopBlocked();
        var topBlockedCompanies = [];
        list.forEach(function(item){
            topBlockedCompanies.push(Companies.get(item))
        });

        return topBlockedCompanies;
    }

    var exports = {
        "getTopBlocked": getTopBlocked
    };
    return exports;
})();
