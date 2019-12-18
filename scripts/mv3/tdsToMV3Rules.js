const fs = require('fs')
const transform = require('./imports/trasformRules')

const buff = fs.readFileSync('./data/tds.json')
const tds = JSON.parse(buff.toString())

const {rules, stats} = transform(tds)

console.log(stats)

fs.writeFileSync('./data/rules.json', JSON.stringify(rules, null, 2))
