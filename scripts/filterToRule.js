/*
 * Convert adblock filters to regex rules
 * node filterToRule.js -f <filterlist> -o <outputfile> -c <path to tracker file> -t <rule type: 'rule' or 'whitelist'>
 */

const program = require('commander')
const fs = require('fs')
const merge = require('deepmerge')
const _ = require('underscore')
const assert = require('assert')
const utils = require('../shared/js/background/utils.es6')
const RandExp = require('randexp')

// store process rule regexes in key/val to look for duplicates
let rules = {}

program
    .option('-f, --file <name>', 'Text file with newline-separated filter list')
    .option('-o, --output <name>', 'Output file name')
    .option('-c, --combine <path>', 'Path of trackers file to combine with')
    .option('-t, --ruleType <name>', 'Type of filtes, rules or whitelist')
    .parse(process.argv)

if (!(program.file && program.output)) {
    program.help()
}


(() => {
    let filters = fs.readFileSync(program.file).toString().split('\n')

    // process filters, translate to rules, merge duplicates
    filters.map(f => {
        if (!f) return 

        let rule = parseFilter(f.toLowerCase())

        if (!rule) return 

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

    if (program.test) {
        runTests()
    }

    combineWithTrackers(groupRulesByHost(rules)) 

})()

// run parser against known outputs
function runTests () {
    const tests = require('./tests.json')
    // run tests on known input-output
    Object.keys(tests).map(f => {
        let rule = parseFilter(f.toLowerCase())
        assert(_.isEqual(tests[f], rule), `Parsed: ${JSON.stringify(rule)}, Expected: ${JSON.stringify(tests[f])}`)
    })
}

function combineWithTrackers (rulesToAdd) {
    let trackers = require(program.combine)
    const trackerCategories = ['Analytics', 'Social', 'Advertising']
    // rules that don't have a host match in the trackers file. We can't add these
    // but we can write them to a file a save for later
    let unMatchedRules = []
    
    Object.keys(rulesToAdd).map(host => {
        let foundTracker = false

        trackerCategories.map(c => {
            if (trackers[c][host]) {
                foundTracker = true
                // if we don't have existing rules for this tracker the no need to merge rules
                if (!trackers[c][host][program.ruleType]) {
                    trackers[c][host][program.ruleType] = rulesToAdd[host][program.ruleType]
                } else {
                    // or we have to find duplicate rules and merge them
                    trackers[c][host][program.ruleType] = mergeTrackerEntry(
                        rulesToAdd[host][program.ruleType], 
                        trackers[c][host][program.ruleType]
                    )
                }
            }
        })

        if (!foundTracker) unMatchedRules.push(rulesToAdd[host])
    })

    fs.writeFileSync('new-trackersWithParentCompany.json', JSON.stringify(trackers, null, 4))
    console.log("Wrote new trackers file to: new-trackersWithParentCompany.json")
    fs.writeFileSync('unMatchedRules.json', JSON.stringify(unMatchedRules, null, 4))
    console.log("Wrote unmatched rules to: unMatchedRules.json")


}

// merge rule lists for a single tracker
function mergeTrackerEntry (a, b) {
    let newRules = []
    let oldUnmatchedRules = []

    // loop through 'a', then look for a matching rule in 'b'. If a match is found, merge, otherwise
    // just use the new 'a' rule
    a.map(aRule => {
        let combined

        b.map(bRule => {
            if (aRule.rule === bRule.rule) {
                combined = merge(aRule, bRule, { arrayMerge: (b,c) => _.union(b,c) })
            } else {
                oldUnmatchedRules.push(bRule)
            }
        })

        // add either the combined rule or the new 'a' rule
        combined ? newRules.push(combined) : newRules.push(aRule)

    })

    // combine any non-matched old 'b' rules. The result here should be a new array with 
    // new 'a' rules, merged a,b matches, and old unmatched 'b' rules
    return newRules.concat(oldUnmatchedRules)
}

function parseFilter (filter) {
    let rule = {}
    let optionStr = ''

    // check that this is a filter we currently support parsing
    // Only host anchored filters are supported right now. '||'
    if (!filter.match(/^\|\|/)) {
        console.warn(`Unsuported filter: ${filter}`)
        return false
    }

    // find the index of the filter options, if any
    let optionIndex = filter.lastIndexOf('$')

    // separate the filter from the option string
    if (optionIndex !== -1) {
        optionStr = filter.substr(optionIndex+1)
        filter = filter.substr(0,optionIndex)
    }

    // remove host anchors
    filter = filter.replace(/\|\|/,'')

    // escape some chars for json, ()/?.|
    filter = filter.replace(/(\(|\)|\/|\?|\.|\|)/g,'\\$1')

    // ending ^ to ($|[?/])
    filter = filter.replace(/\^$/, '($|[?/])')

    // *^ pattern to [?/].*
    filter = filter.replace(/\*\^/g, '[?/].*')
    
    // ^* pattern to [?/].*
    filter = filter.replace(/\^\*/g, '[?/].*')

    // single wild card * to .*
    // don't match on [?/].* pattern from above
    filter = filter.replace(/(?<!\[\?\/\]\.)\*/g, '.*')

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
            // Turn domain list to array, skip domains with negation '~'
            options.domains = o.replace('domain=', '').split('|').filter(d => !d.match('~'))
        } else {
            // request type options
            if (!options.types) options.types = []
            options.types.push(o)
        }
    })
    return options
}

function groupRulesByHost (rules) {
    let byHost = {}

    Object.keys(rules).map(r => {
        if (!r) return 

        const host = utils.extractHostFromURL(regexToURL(r))
        
        if (!byHost[host]) {
            byHost[host] = {}
            byHost[host][program.ruleType] = []
        }
        byHost[host][program.ruleType].push(rules[r])
    })

    return byHost
}

function regexToURL (re) {
    let randExp = new RandExp(re).gen()
    return `http://${randExp}`
}
