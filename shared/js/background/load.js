const browserWrapper = require('./wrapper')

function JSONfromLocalFile(path) {
    return loadExtensionFile({ url: path, returnType: 'json' })
}

function JSONfromExternalFile(urlString) {
    return loadExtensionFile({ url: urlString, returnType: 'json', source: 'external' })
}

function url(urlString) {
    return loadExtensionFile({ url: urlString, source: 'external' })
}

/*
 * Params:
 *  - url: request URL
 *  - source: requests are internal by default. set source to 'external' for non-extension URLs
 *  - etag: set an if-none-match header
 */
async function loadExtensionFile(params) {
    const headers = new Headers()
    let urlString = params.url

    if (params.source === 'external') {
        if (await browserWrapper.getFromSessionStorage('dev')) {
            if (urlString.indexOf('?') > -1) {
                urlString += '&'
            } else {
                urlString += '?'
            }

            urlString += 'test=1'
        }

        if (params.etag) {
            headers.append('If-None-Match', params.etag)
        }
    } else {
        urlString = browserWrapper.getExtensionURL(urlString)
    }

    let rej
    const timeoutPromise = new Promise((resolve, reject) => {
        rej = reject
    })
    // @ts-ignore
    const fetchTimeout = setTimeout(rej, params.timeout || 30000)

    const fetchResult = fetch(urlString, {
        method: 'GET',
        headers,
    }).then(async (response) => {
        clearTimeout(fetchTimeout)

        const status = response.status
        const etag = response.headers.get('etag')
        const date = response.headers.get('Date')
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
                date,
                etag,
                data,
            }
        } else if (status === 304) {
            console.log(`${urlString} returned 304, resource not changed`)
            return {
                status,
                date,
                etag,
            }
        } else {
            throw new Error(`${urlString} returned ${response.status}`)
        }
    })

    return Promise.race([timeoutPromise, fetchResult])
}

module.exports = {
    loadExtensionFile,
    JSONfromLocalFile,
    JSONfromExternalFile,
    url,
}
