require.scopes.utils = ( () => {
    
    function getHost(url) {
        var url = new URL(url);
        return url.hostname;
    }
    
    var exports = {};
    exports.getHost = getHost;
    return exports;
})();
