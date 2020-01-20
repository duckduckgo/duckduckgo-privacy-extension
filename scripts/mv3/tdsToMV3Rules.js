const fs = require('fs')
const transform = require('./imports/trasformRules')

const buff = fs.readFileSync('./data/tds.json')
const tds = JSON.parse(buff.toString())

const {rules, stats} = transform(tds)

const lastId = rules[rules.length - 1].id

// append catch-all https upgrade rule
rules.push({
    id: lastId + 1,
    priority: 1,
    condition: {
        urlFilter: '|http://*',
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['main_frame']
    },
    action: {
        type: 'upgradeScheme'
    }
})

console.log(stats)

fs.writeFileSync('./data/rules.json', JSON.stringify(rules, null, 2))
