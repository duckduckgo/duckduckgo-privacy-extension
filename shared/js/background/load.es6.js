const browserWrapper = require('./wrapper.es6')

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

async function fetchData(url, fallbackUrl, headers) {
    let response = null
    response = await fetch(url, { method: 'GET', headers })
    if (fallbackUrl && response.status !== 200 && response.status !== 304) {
        response = await fetch(fallbackUrl, { method: 'GET', headers })
    }

    return response
}

function addTestParameters(url) {
    let newUrl = url

    if (newUrl.indexOf('?') > -1) {
        newUrl += '&'
    } else {
        newUrl += '?'
    }

    newUrl += 'test=1'

    return newUrl
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
    let fallbackUrl = params.fallbackUrl

    if (params.source === 'external') {
        if (dev) {
            url = addTestParameters(url)
            if (fallbackUrl) {
                fallbackUrl = addTestParameters(fallbackUrl)
            }
        }

        if (params.etag) {
            headers.append('If-None-Match', params.etag)
        }
    } else {
        url = browserWrapper.getExtensionURL(url)
    }

    let rej
    const timeoutPromise = new Promise((resolve, reject) => { rej = reject })
    const fetchTimeout = setTimeout(rej, params.timeout || 30000)

    const fetchResult = fetchData(url, fallbackUrl, headers)
    .then(async response => {
        clearTimeout(fetchTimeout)

        const status = response.status
        const etag = response.headers.get('etag')
        let data

        if (status === 200) {
            if (params.returnType === 'json') {
                data = await response.json()
            } else if (params.returnType === 'arraybuffer') {
                data = await response.arrayBuffer()
            } else {
                data = await response.text()
            }

            return {
                status,
                etag,
                data
            }
        } else if (status === 304) {
            console.log(`${response.url} returned 304, resource not changed`)
            return {
                status,
                etag
            }
        } else {
            throw new Error(`${response.url} returned ${response.status}`)
        }
    })

    return Promise.race([timeoutPromise, fetchResult])
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
