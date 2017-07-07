require.scopes.load = ( () => {

    function JSONfromLocalFile(path){
        return JSON.parse(loadExtensionFile(path, 'json'));
    }

    function JSONfromExternalFile(url){
        try {
            return JSON.parse(loadExtensionFile(url, 'json', 'external'))
        }
        catch(e) {
            return {}
        }
    }

    function loadExtensionFile(url, returnType, source){
        var xhr = new XMLHttpRequest();

        if(source === 'external'){
            xhr.open("GET", url, false);
        }
        else {
            xhr.open("GET", chrome.extension.getURL(url), false);
        }

        xhr.send(null);

        if (xhr.readyState != 4) {
            return;
        }

        if (returnType === 'xml') {
            return xhr.responseXML;
        }
        
        if (returnType === 'json') {
            return xhr.responseText;
        }

        return xhr.responseText;
    }

    var exports = {
        loadExtensionFile: loadExtensionFile,
        JSONfromLocalFile: JSONfromLocalFile,
        JSONfromExternalFile: JSONfromExternalFile
    }
    return exports;
})();
