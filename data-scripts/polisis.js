const fs = require('fs')
const polisisData = require('../data/symlinked/polisis')
const reasonsWithScore = {
    "Certain data is shared with third parties for advertising purposes.": 4,
    "Some personal information is shared with third parties.": 6,
    "Data might be shared in the case of a merger or acquisition.": 1,
    "Some data might be retained indefinitely.": 1
}

let outputData = {}

Object.keys(polisisData).forEach((url) => {
    outputData[url] = {
        reasons: {
            good: [],
            bad: []
        },
        score: 0
    }

    Object.keys(polisisData[url].bad).forEach((reason) => {
        if (reasonsWithScore[reason]) {
            outputData[url].reasons.bad.push(reason)
            outputData[url].score += reasonsWithScore[reason]
        }
    })
})

fs.writeFileSync('data/generated/polisis.json', JSON.stringify(outputData))
