require.scopes.utils = ( () => {
    
    function getHost(url) {
        try {
            var url = new URL(url);
            return url.hostname;
        } catch (e) {
            console.log("Invalid URL: " + url);
            return;
        }
    }
    
    var exports = {};
    exports.getHost = getHost;
    return exports;
})();
