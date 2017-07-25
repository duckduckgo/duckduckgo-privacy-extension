require.scopes.load = ( () => {

    function JSONfromLocalFile(path, cb){
        loadExtensionFile(path, 'json', null, (res) => cb(JSON.parse(res)))
    }

    function JSONfromExternalFile(url, cb){
        try {
            loadExtensionFile(url, 'json', 'external', (res) => cb(JSON.parse(res)))
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

    function loadExtensionFile(url, returnType, source, cb){
        var xhr = new XMLHttpRequest();

        if(source === 'external'){
            xhr.open("GET", url);
        }
        else {
            xhr.open("GET", chrome.extension.getURL(url));
        }

        xhr.send(null);

        xhr.onreadystatechange = function() {
            let done = XMLHttpRequest.DONE ? XMLHttpRequest.DONE : 4
            if (xhr.readyState === done && xhr.status === 200) {
                cb(returnResponse(xhr, returnType))
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
