const browserWrapper = require('./$BROWSER-wrapper.es6')

let dev = false

function JSONfromLocalFile (path) {
    return loadExtensionFile({ url: path, returnType: 'json' })
}

function JSONfromExternalFile (url) {
    return loadExtensionFile({ url: url, returnType: 'json', source: 'external' })
}

function url (url) {
    return loadExtensionFile({ url: url, source: 'external' })
}

function returnResponse (xhr, returnType) {
    if (returnType === 'json' && xhr && xhr.responseText) {
        let res

        try {
            res = JSON.parse(xhr.responseText)
        } catch (e) {
            console.warn(`couldn't parse JSON response: ${xhr.responseText}`)
        }

        return res
    } else if (returnType === 'xml') {
        return xhr.responseXML
    } else if (returnType === 'arraybuffer') {
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
function loadExtensionFile (params) {
    const xhr = new XMLHttpRequest()
    let url = params.url

    if (params.source === 'external') {
        if (dev) {
            if (url.indexOf('?') > -1) {
                url += '&'
            } else {
                url += '?'
            }

            url += 'test=1'
        }

        xhr.open('GET', url)

        if (params.etag) {
            xhr.setRequestHeader('If-None-Match', params.etag)
        }
    } else {
        // set type xhr type tag. Safari internal xhr requests
        // don't set a 200 status so we'll check this type
        xhr.type = 'internal'
        xhr.open('GET', browserWrapper.getExtensionURL(url))
    }

    if (params.responseType) {
        xhr.responseType = params.responseType
    }

    xhr.timeout = params.timeout || 30000

    xhr.send(null)

    return new Promise((resolve, reject) => {
        xhr.ontimeout = () => {
            reject(new Error(`${url} timed out`))
        }
        xhr.onreadystatechange = () => {
            const done = XMLHttpRequest.DONE ? XMLHttpRequest.DONE : 4
            if (xhr.readyState === done) {
                if (xhr.status === 200 || (xhr.type && xhr.type === 'internal')) {
                    xhr.data = returnResponse(xhr, params.returnType)
                    if (!xhr.data) reject(new Error(`${url} returned no data`))
                    resolve(xhr)
                } else if (xhr.status === 304) {
                    console.log(`${url} returned 304, resource not changed`)
                    resolve(xhr)
                } else {
                    reject(new Error(`${url} returned ${xhr.status}`))
                }
            }
        }
    })
}

function setDevMode () {
    dev = true
}

module.exports = {
    loadExtensionFile: loadExtensionFile,
    JSONfromLocalFile: JSONfromLocalFile,
    JSONfromExternalFile: JSONfromExternalFile,
    url: url,
    setDevMode: setDevMode
}
