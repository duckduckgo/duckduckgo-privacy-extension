const browserWrapper = require('./$BROWSER-wrapper.es6')

function JSONfromLocalFile (path, cb) {
    loadExtensionFile({url: path, returnType: 'json'}, (res) => cb(res))
}

function JSONfromExternalFile (url, cb) {
    try {
        loadExtensionFile({url: url, returnType: 'json', source: 'external'}, (res, xhr) => cb(res, xhr))
    } catch (e) {
        console.log(e)
        return {}
    }
}

function returnResponse (xhr, returnType) {
    if (returnType === 'xml') {
        return xhr.responseXML;
    } else if (returnType === 'json') {
        return xhr.response
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
function loadExtensionFile (params, cb) {
    var xhr = new XMLHttpRequest()

    if (params.source === 'external') {
        xhr.open('GET', params.url)
        if (params.etag) {
            xhr.setRequestHeader('If-None-Match', params.etag)
        }
    } else {
        // set type xhr type tag. Safari internal xhr requests
        // don't set a 200 status so we'll check this type
        xhr.type = 'internal'
        xhr.open('GET', browserWrapper.getExtensionURL(params.url))
    }

    if (params.returnType) {
        xhr.responseType = params.returnType;
    }

    xhr.send(null);

    xhr.onreadystatechange = function () {
        let done = XMLHttpRequest.DONE ? XMLHttpRequest.DONE : 4
        if (xhr.readyState === done) {
            if (xhr.status === 200 || (xhr.type && xhr.type === 'internal')) {
                cb(returnResponse(xhr, params.returnType), xhr)
            }
        }
    }
}

module.exports = {
    loadExtensionFile: loadExtensionFile,
    JSONfromLocalFile: JSONfromLocalFile,
    JSONfromExternalFile: JSONfromExternalFile
}
