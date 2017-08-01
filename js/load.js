// const jsonpCallbacks = {}

require.scopes.load = ( () => {

    function JSONfromLocalFile(path, cb){
        loadExtensionFile(path, 'json', null, (res) => cb(JSON.parse(res)))
    }

    function JSONfromExternalFile(url, cb){
        try {
            loadExtensionFile(url, 'json', 'external', (res) => {
                // if (url === "http://jason.duckduckgo.com/collect.js?type=httpse") debugger;
                cb(JSON.parse(res))
            })
        }
        catch(e) {
            return {}
        }
    }

    /* TODO: Extension CSP's don't allow jsonp,
             ping jason to switch to plain xhr (see manifest.json permissions)

    function JSONPfromExternalFile (url, cb) {
        const cbName = 'cb' + Math.round(Math.random() * 1000000)
        const cbParam = 'callback=jsonpCallbacks.' + cbName
        const _url = new URLParser(url)
        url = _url.query ? url += '&' + cbParam : url += '?' + cbParam
        console.log('load JSONPfromExternalFile url = ' + url)
        jsonpCallbacks[cbName] = function (data) {
            console.log('_jsonpCb callback, data: ', data)
            var d = {}
            try {
                d = JSON.parse(data)
            } catch (e) {}
            cb(d)
        }

        try {
            loadExtensionFile(url, 'jsonp', 'external')
        }
        catch (e) {
            return {}
        }
    }
    */

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
                if (cb) return cb(returnResponse(xhr, returnType))
                debugger;
            }
        }
    }

    var exports = {
        loadExtensionFile: loadExtensionFile,
        JSONfromLocalFile: JSONfromLocalFile,
        JSONfromExternalFile: JSONfromExternalFile//,
        // JSONPfromExternalFile: JSONPfromExternalFile
    }
    return exports;
})();
