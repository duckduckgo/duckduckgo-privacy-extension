/* Collect ToSDR data and process the privacy related points in defined in scripts/tosdr-topics.json 
 * We will use this processed data in our grade calculation. The process data is written to data/tosdr.json
 *
 * The list is updated when you run `make` or `make release`
 */
const request = require('request')
const topics = require('./tosdr-topics.json')
const fs = require('fs')
const tldjs = require('tldjs')
let processed = {}
let nProcessed = 0

function getSites() {
    // get the full list of tosdr sites. This does not include points data. We will
    // have to make a separate request for that.
    request.get('https://tosdr.org/index/services.json', (err, res, body) => {
            let sites = Object.keys(JSON.parse(body))

            // recurse through sites list. Get and process the detailed points data for each
            getSitePoints(sites).then(result => {
                fs.writeFile('shared/data/tosdr.json', JSON.stringify(processed, null, 4), err => { if(err) console.log(err)} )
            })
    })
}

function getSitePoints (sites) {
    return new Promise((resolve, reject) => {

    if (sites.length === 0) {
        return resolve()
    }

    let site = encodeURIComponent(sites.pop())
    nProcessed += 1

    let githubRepo = 'https://raw.githubusercontent.com/tosdr/tosdr.org/master'
    let url = `${githubRepo}/api/1/service/${site}.json`

    if (nProcessed % 5 === 0) process.stdout.write('.')

    // get the detailed points data for this site
    request.get(url, (err, res, body) => {
        let points = {score: 0, all: {bad: [], good: []}, match: {bad: [], good: []}}
        let allData

        try {
            allData = JSON.parse(body)
        } catch (e) {
            console.log(`error getting privacy data for: ${site}`)
            return resolve(getSitePoints(sites))
        }

        let pointsData = allData.pointsData
        let relatedUrls = allData.urls || []

        points.class = allData.class
        
        for (pointName in pointsData) {
            let point = pointsData[pointName]
            let pointCase = point.tosdr.case
            let score = point.tosdr.score || 0
            if (!pointCase) continue

            // standardize case (some of them start with caps)
            pointCase = pointCase.toLowerCase()
            // standardize score (some of them come as strings)
            score = parseInt(score, 10)

            let type = point.tosdr.point

            if (type === 'good' || type === 'bad')
                addPoint(points, type, pointCase, score)
        }

        // we use class in our score but we may not have privacy-related reasons for it
        // so show all available reasons instead
        if (points.class &&
                (!points.match.good || !points.match.good.length) &&
                (!points.match.bad || !points.match.bad.length)) {
            points.match.good = points.all.good
            points.match.bad = points.all.bad
        }

        // get site url
        let servicesUrl = `${githubRepo}/services/${site}.json`
        request.get(servicesUrl, (err, res, body) => {
            let data = JSON.parse(body)
            // some sites lack the 'url' field, but have
            // multiple items in the 'urls' field.
            if (!data.url && relatedUrls) {
                data.url = relatedUrls.shift()
            }

            if (data.url) {
                let parsedUrl = tldjs.parse(data.url)
                processed[parsedUrl.domain] = points

                // link related sites with the same points
                relatedUrls.forEach((url) => {
                    processed[url] = points
                })
            }
            resolve(getSitePoints(sites))
        })
    })
    })
}

function addPoint(points, type, pointCase, score) {
    
    points['all'][type].push(pointCase)
    
    // is this a point we care about
    if (topics[type].indexOf(pointCase) !== -1 &&
            // avoid adding duplicate points
            points['match'][type].indexOf(pointCase) === -1){
        points['match'][type].push(pointCase)

        if (type === 'bad') {
            points.score += score
        } else {
            points.score -= score
        }
    }
}

getSites()
