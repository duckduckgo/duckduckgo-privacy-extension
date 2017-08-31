const request = require('request')
const fs = require('fs')

let processed = {}

function getSites() {
        request.get('https://tosdr.org/index/services.json', (err, res, body) => {
                let sites = Object.keys(JSON.parse(body))
                getSitePoints(sites).then(result => {
                    fs.writeFile('tosdr.json', JSON.stringify(processed, null, 4), err => console.log(err))
                })
         })
}

function getSitePoints (sites) {
    return new Promise((resolve, reject) => {

    if (sites.length === 0) {
        return resolve()
    }

    let name = sites.pop()
    let url = `https://tosdr.org/api/1/service/${name}.json`

    console.log(`GET: ${name}`)

    request.get(url, (err, res, body) => {
        let points = {bad: [], good: []}
        let pointsData = JSON.parse(body).pointsData
            for (point in pointsData) {
                if (pointsData[point].tosdr.point === "bad") 
                    points['bad'].push(pointsData[point].tosdr.case)
                else if (pointsData[point].tosdr.point === "good") 
                    points['good'].push(pointsData[point].tosdr.case)
            }
        processed[name] = points;
        resolve(getSitePoints(sites))
    });
    })
}

getSites()
