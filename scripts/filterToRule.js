const program = require('commander')
const fs = require('fs')
const chalk = require('chalk')
const merge = require('deepmerge')

// store process rule regexes in key/val to look for duplicates
let rules = {}

program
    .option('-f, --file <name>', 'Text file with newline-separated filter list')
    .option('-o, --output <name>', 'Output file name')
    .parse(process.argv)

if (!(program.file && program.output)) {
    program.help()
}

(() => {
    let filters = fs.readFileSync(program.file).toString().split('\n')

    filters.map(f => {
        let rule = parseFilter(f)

        // add to rules or merge duplicates
        if (!rules[rule.regex]) {
            rules[rule.regex] = rule
        } else {
            rules[rule.regex] = merge(rules[rule.regex], rule)
        }
    })
    console.log(JSON.stringify(rules))
})()

function parseFilter (filterOrig) {
    let rule = {}
    let filter = filterOrig
    let optionStr = ''

    // find the index of the filter options, if any
    let optionIndex = filter.lastIndexOf('$')

    // separate the filter from the option string
    if (optionIndex !== -1) {
        optionStr = filter.substr(optionIndex+1)
        filter = filter.substr(0,optionIndex)
    }

    // remove host anchors
    filter = filter.replace(/\|\|/,'')

    // escape some chars for json
    filter = filter.replace(/(\/|\?|\.)/gi,'\\$1')

    // ending ^
    filter = filter.replace(/\^$/, '($|[?/])')
    
    // ^* pattern 
    filter = filter.replace(/\^\*/, '[?/].*')

    // single wild card
    filter = filter.replace(/([^\.\^])\*/, '$1.*')

    // add final filter to rule object
    rule.regex = filter

    let options = parseOptions(optionStr)

    if (Object.keys(options).length) {
        rule.options = options
    }

    return rule
}

function parseOptions (optionStr) {
    let options = {}

    // split option string on commas
    let optionList = optionStr.split(',')


    optionList.map(o => {
        // skip third party option. All of our rules
        // are by default third party
        if (!o || o.match(/third-party|first-party/)) {
            return 
        }

        // look for domain list indicator 
        if (o.match(/^domain=/)) {
            options.domains = o.replace('domain=', '').split('|')
            // we don't deal with negation in domain lists
            options.domains.filter(d => !d.match('~'))
        } else {
            // request type options
            if (!options.types) options.types = []
            options.types.push(o)
        }
    })
    return options
}

