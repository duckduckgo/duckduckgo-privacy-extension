require.scopes.load = ( () => {

    function JSONfromLocalFile(path, cb){
        loadExtensionFile({url: path, returnType: 'json'}, (res) => cb(JSON.parse(res)))
    }

    function JSONfromExternalFile(url, cb){
        try {
            loadExtensionFile({url: url, returnType: 'json', source: 'external'}, (res, xhr) => cb(JSON.parse(res), xhr))
        }
        catch(e) {
            return {}
        }
    }

    function returnResponse(xhr, returnType) {
        if (returnType === 'xml') {
            return xhr.responseXML;
        } else {
            return xhr.responseText
        }
    }

    /*
     * Params:
     *  - url: request URL
     *  - source: requests are internal by default. set source to 'external' for non-extension URLs
     *  - etag: set an if-none-match header
     */
    function loadExtensionFile(params, cb){
        var xhr = new XMLHttpRequest();

        if(params.source === 'external'){
            xhr.open("GET", params.url);
            if (params.etag) {
                xhr.setRequestHeader('If-None-Match', params.etag)
            }
        }
        else {
            xhr.open("GET", chrome.extension.getURL(params.url));
        }

        xhr.send(null);

        xhr.onreadystatechange = function() {
            let done = XMLHttpRequest.DONE ? XMLHttpRequest.DONE : 4
            if (xhr.readyState === done && xhr.status === 200) {
                cb(returnResponse(xhr, params.returnType), xhr)
            }
        }
    }

    var exports = {
        loadExtensionFile: loadExtensionFile,
        JSONfromLocalFile: JSONfromLocalFile,
        JSONfromExternalFile: JSONfromExternalFile
    }
    return exports;
})();
