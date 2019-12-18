// fetch latest TDS, make sure it's valid JSON, and save it on disk

const tdsURL = 'https://staticcdn.duckduckgo.com/trackerblocking/tds.json'
const https = require('https')
const fs = require('fs')

https.get(tdsURL, res => {
    const { statusCode } = res
    const contentType = res.headers['content-type']

    let error
    if (statusCode !== 200) {
        error = new Error(`Request Failed.\n Status Code: ${statusCode}`)
    } else if (!/^application\/json/.test(contentType) && !/^text\/plain/.test(contentType)) {
        error = new Error(`Invalid content-type.\n Expected application/json but received ${contentType}`)
    }
    if (error) {
        console.error(error.message)
        res.resume()
        return
    }

    res.setEncoding('utf8')
    let rawData = ''
    res.on('data', (chunk) => { rawData += chunk })
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData)
            fs.writeFileSync('./data/tds.json', JSON.stringify(parsedData, null, 2))

            console.log('Downloaded sucessfully.')
        } catch (e) {
            console.error(e.message)
        }
    })
})
