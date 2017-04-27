require.scopes.utils = ( () => {

    function extractHostFromURL(url) {
        var a = document.createElement('a');
        a.href = url;
        var parts = a.hostname.split('.');
        var host = parts.slice(-2).join('.');
        return host;
    }

    var exports = {};
    exports.extractHostFromURL = extractHostFromURL;
    return exports;
})();
