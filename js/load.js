require.scopes.load = ( () => {

    function loadExtensionFile(url, returnType){
        var xhr = new XMLHttpRequest();
        xhr.open("GET", chrome.extension.getURL(url), false);
        xhr.send(null);

        if (xhr.readyState != 4) {
            return;
        }

        if (returnType === 'xml') {
            return xhr.responseXML;
        }
        
        if (returnType === 'json') {
            return xhr.responseJSON;
        }
    }

    var exports = {};
    exports.loadExtensionFile = loadExtensionFile;
    return exports;
})();
