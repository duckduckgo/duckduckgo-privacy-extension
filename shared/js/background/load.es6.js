const browserWrapper = require('./$BROWSER-wrapper.es6')

let dev = false

function JSONfromLocalFile (path) {
    return loadExtensionFile({url: path, returnType: 'json'})
}

function JSONfromExternalFile (url) {
    return loadExtensionFile({url: url, returnType: 'json', source: 'external'})
}

function url (url) {
    return loadExtensionFile({ url: url, source: 'external' })
}

/*
 * Params:
 *  - url: request URL
 *  - source: requests are internal by default. set source to 'external' for non-extension URLs
 *  - etag: set an if-none-match header
 */
function loadExtensionFile (params) {
    const headers = new Headers()
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

        if (params.etag) {
            headers.append('If-None-Match', params.etag)
        }
    } else {
        url = browserWrapper.getExtensionURL(url)
    }

    return fetch(url, {
        method: 'GET',
        headers
    }).then(response => {
        const status = response.status
        const etag = response.headers.get('etag')

        if (status === 200) {
            if (params.returnType === 'json') {
                return response.json()
                    .then(data => {
                        return {
                            status,
                            etag,
                            data
                        }
                    })
            }

            return response.text()
                .then(data => {
                    return {
                        status,
                        etag,
                        data
                    }
                })
        } else if (status === 304) {
            console.log(`${url} returned 304, resource not changed`)
            return {
                status,
                etag
            }
        } else {
            throw new Error(`${url} returned ${response.status}`)
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
