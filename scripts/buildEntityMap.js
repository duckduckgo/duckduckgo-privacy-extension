const request = require('request')
const fs = require('fs')

const requestData = {
    method: 'get',
    uri: 'https://duckduckgo.com/contentblocking.js?l=entitylist2',
    gzip: true
}

request(requestData, (err, res, body) => {
    if (err) {
        return console.log(err)
    }

    const json = JSON.parse(body)
    const out = {}

    for (const parent in json) {
        json[parent].properties.forEach(url => {
            out[url] = parent
        })
        json[parent].resources.forEach(url => {
            out[url] = parent
        })
    }

    fs.writeFile('shared/data/tracker_lists/entityMap.json', JSON.stringify(out), (err) => { if (err) console.log(err) })
})
