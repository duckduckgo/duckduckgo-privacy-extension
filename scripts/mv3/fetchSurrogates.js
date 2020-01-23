// fetch latest surrogats and save them in the shared data folder

const constants = require('../../shared/data/constants')
const surrogatesUrl = constants.tdsLists.find(item => item.name === 'surrogates').url
const https = require('https')
const zlib = require('zlib')
const url = require('url')
const fs = require('fs')
const path = require('path')
const SURROGATES_DIR = '../../shared/data/tracker_lists/surrogates/'

console.log(`Downloading from "${surrogatesUrl}"…`)

if (!fs.existsSync(SURROGATES_DIR)) {
    fs.mkdirSync(SURROGATES_DIR)
}

https.get(surrogatesUrl, res => {
    const { statusCode } = res
    const contentType = res.headers['content-type']

    let error
    if (statusCode !== 200) {
        error = new Error(`Request Failed.\n Status Code: ${statusCode}`)
    } else if (!/^text\/plain/.test(contentType)) {
        error = new Error(`Invalid content-type.\n Expected text/plain but received ${contentType}`)
    }
    if (error) {
        console.error(error.message)
        res.resume()
        return
    }

    // un-gzip the payload
    const gunzip = zlib.createGunzip()
    res.pipe(gunzip)

    let rawData = ''
    gunzip.on('data', (chunk) => { rawData += chunk })
    gunzip.on('end', () => {
        rawData.trim().split('\n\n')
            .forEach(surrogate => {
                // remove comment lines that begin with #
                const lines = surrogate.split('\n').filter((line) => {
                    return !(/^#.*/).test(line)
                })
                // remove first line, store it
                const firstLine = lines.shift()
                // take identifier from first line
                const header = firstLine.split(' ')[0]
                const body = lines.join('\n')
                const pathname = url.parse(`http://${header}`).pathname
                const file = pathname.match(/\/([^/]+)$/)[1]

                console.log(`Creating surrogate for "${file}".`)
                fs.writeFileSync(path.join(SURROGATES_DIR, file), body)
            })
    })
})
