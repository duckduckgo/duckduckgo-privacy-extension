const fs = require('fs')
const transform = require('./imports/transformRules')
const path = require('path')
const RULES_DIR = '../../shared/data/tracker_lists/'

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

fs.writeFileSync(path.join(RULES_DIR, 'rules.json'), JSON.stringify(rules, null, 2))
