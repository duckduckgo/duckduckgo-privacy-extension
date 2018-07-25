const program = require('commander')
const fs = require('fs')
const merge = require('deepmerge')
const tests = require('./tests.json')
const _ = require('underscore')
const assert = require('assert')

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
        if (!f) return 

        let rule = parseFilter(f.toLowerCase())

        // add to rules or merge duplicates
        if (!rules[rule.rule]) {
            rules[rule.rule] = rule
        } else {
            // merge and combine unique array elements
            rules[rule.rule] = merge(
                rules[rule.rule], 
                rule, 
                { arrayMerge: (a1, a2) => _.union(a1, a2) }
            )
        }
    })

    writeFile(rules)

    // run tests on known input-output
    Object.keys(tests).map(f => {
        let rule = parseFilter(f.toLowerCase())
        assert(_.isEqual(tests[f], rule), true)
    })
})()

function writeFile (rules) {
    // write a file with one rule per line sorted by rule to make
    // manual copying easier later on
    let out = Object.values(rules)
        .sort((a, b) => {
            if (a.rule > b.rule) return 1
            if (a.rule < b.rule) return -1
            return 0
        })
        .reduce((result, val) => `${result}${JSON.stringify(val)},\n`, '')

    fs.writeFileSync(program.output, `[\n${out}]`)
    console.log(`Wrote: ${program.output}`)
}

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
    filter = filter.replace(/(\/|\?|\.)/g,'\\$1')

    // ending ^
    filter = filter.replace(/\^$/, '($|[?/])')
    
    // ^* pattern 
    filter = filter.replace(/\^\*/g, '[?/].*')

    // single wild card
    filter = filter.replace(/([^\.\^])\*/g, '$1.*')

    console.log(filter)

    // make sure this is a valid regex
    assert.doesNotThrow(() => new RegExp(filter))
    
    // add final filter to rule object
    rule.rule = filter

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

