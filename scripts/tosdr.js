const request = require('request')
const topics = require('./tosdr-topics.json')
const fs = require('fs')

let processed = {}
let nProcessed = 0

function getSites() {
        request.get('https://tosdr.org/index/services.json', (err, res, body) => {
                let sites = Object.keys(JSON.parse(body))
                getSitePoints(sites).then(result => {
                    fs.writeFile('data/tosdr.json', JSON.stringify(processed, null, 4), err => { if(err) console.log(err)} )
                })
         })
}

function getSitePoints (sites) {
    return new Promise((resolve, reject) => {

    if (sites.length === 0) {
        return resolve()
    }

    let name = sites.pop()
    nProcessed += 1

    let url = `https://tosdr.org/api/1/service/${name}.json`

    if (nProcessed % 5 === 0) process.stdout.write('.')

    request.get(url, (err, res, body) => {
        let points = {score: 0, all: {bad: [], good: []}, match: {bad: [], good: []}}
        let allData = JSON.parse(body)
        let pointsData = allData.pointsData

            points.class = allData.class

            for (point in pointsData) {
                if (!pointsData[point].tosdr.case) continue

                if (pointsData[point].tosdr.point === "bad") {
                    points['all']['bad'].push(pointsData[point].tosdr.case)

                    if (topics.bad.indexOf(pointsData[point].tosdr.case) !== -1){
                            points['match']['bad'].push(pointsData[point].tosdr.case)
                            points.score += pointsData[point].tosdr.score
                    }
                }
                else if (pointsData[point].tosdr.point === "good") {
                    points['all']['good'].push(pointsData[point].tosdr.case)
                    
                    if (topics.good.indexOf(pointsData[point].tosdr.case) !== -1){
                        points['match']['good'].push(pointsData[point].tosdr.case)
                        points.score -= pointsData[point].tosdr.score
                    }
                }
            }
        processed[name] = points;
        resolve(getSitePoints(sites))
    });
    })
}

getSites()
