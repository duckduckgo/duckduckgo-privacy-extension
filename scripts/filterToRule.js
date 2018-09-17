/*
 * Convert adblock filters to regex rules
 * node filterToRule.js -f <filterlist> -c <path to tracker file> -t <rule type: 'rule' or 'whitelist'>
 */
const program = require('commander')
const fs = require('fs')
const merge = require('deepmerge')
const _ = require('underscore')
const assert = require('assert')
const utils = require('../shared/js/background/utils.es6')
const RandExp = require('randexp')
const tldjs = require('tldjs')
const trackers = require('./../shared/data/tracker_lists/trackersWithParentCompany.json')
const chalk = require('chalk')

// store process rule regexes in key/val to look for duplicates
let rules = {}
let filterStats = {}
let skipRules = {}

program
    .usage("node filterToRule.js -f <filterlist> -c <path to tracker file> -t <rule type: 'rule' or 'whitelist'>")
    .option('-f, --file <name>', 'Required - Text file with newline-separated filter list')
    .option('-t, --ruleType <name>', 'Required - Type of filtes, rules or whitelist')
    .option('--test', 'Optional - Run parser tests')
    .option('--verbose', 'Optional - Print verbose log messages to screen')
    .parse(process.argv)

if (!(program.file && program.ruleType)) {
    program.help()
}

(() => {
    let filters = fs.readFileSync(program.file).toString().split('\n')

    // process filters, translate to rules, merge duplicates
    filters.forEach(f => {
        if (!f) return 

        // skip ! comment lines
        if (f.match(/^\!/)) return 

        // todo: handle filters with .* as their tld
        if (f.match(/google\.\*/)) {
            printLog(`Can't parse wild card hostnames ${f}`)
            addToLog({type: 'unsupported', count: 1, filter: [f]})
            return
        }

        // make a copy of the filter and remove any filter special
        // characters. We're going to throw this at a URL parser
        // and see if it can extract the hostname from the filter
        let fCopy = f.replace('||', '').replace('^','/').replace('*','/').replace(/\$.*/, '')
        let host = tldjs.parse(fCopy)

        if (!host.isValid && !(host.domain || host.hostname)) {
            //console.log(`Cant parse host. ${f} ${fCopy}`)
            addToLog({type: 'unknown', count: 1, filter: [f]})
            return
        }

        let ruleObj = parseFilter(f.toLowerCase())

        if (!ruleObj) return 

        ruleObj.tldObj = host

        // check to see if we have alredy found conflicting entries for this rule
        if (skipRules[ruleObj.rule]) {
            chalk.red(`Skipping conflicting rules for ${f}, see README: conflicting rules`)
            return
        }

        // add to rules or merge duplicates
        if (!rules[ruleObj.rule]) {
            rules[ruleObj.rule] = ruleObj
        } else {
            // before combining rules, check to make sure their options are consistent.
            hasConflictingRules = checkConflictingRuleOptions(rules[ruleObj.rule], ruleObj)
            if (hasConflictingRules) {
                console.log(chalk.red(`Skipping conflicting rules for ${f}, see README: conflicting rules`))

                // add this rule to skipRules and delete the entry so that we don't add it to the final output.
                skipRules[ruleObj.rule] = 1
                delete rules[ruleObj.rule]
                return
            }

            // merge and combine unique array elements
            rules[ruleObj.rule] = merge(
                rules[ruleObj.rule], 
                ruleObj, 
                { arrayMerge: (a1, a2) => _.union(a1, a2) }
            )
        }
    })

    if (program.test) {
        runTests()
    }

    combineWithTrackers(groupRulesByHost(rules)) 
})()

// Check two rules to make sure they have consistent options. For example, if one rule
// has domain options and the other doesn't then it's not clear which filter should be used. It's
// better to manually combine these filters and rerun the script when they are correct.
function checkConflictingRuleOptions(ruleA, ruleB) {
    const aKeys = ruleA.options ? Object.keys(ruleA.options) : []
    const bKeys = ruleB.options ? Object.keys(ruleB.options) : []

    const diff = _.difference(aKeys,bKeys).concat(_.difference(bKeys,aKeys))
    
    if (diff && diff.length) {
        printLog(`Skipping inconsistent rule options Diff: ${JSON.stringify(diff)}`)
        printLog(`A: ${JSON.stringify(ruleA)}`)
        printLog(`B: ${JSON.stringify(ruleB)}`)
        return true
    }

    return false
}

// run parser against known outputs
function runTests () {
    const tests = require('./tests.json')
    // run tests on known input-output
    Object.keys(tests).forEach(f => {
        let rule = parseFilter(f.toLowerCase())
        assert(_.isEqual(tests[f], rule), `Parsed: ${JSON.stringify(rule)}, Expected: ${JSON.stringify(tests[f])}`)
    })
    console.log('All tests passed')
}

function combineWithTrackers (rulesToAdd) {
    const trackerCategories = ['Analytics', 'Social', 'Advertising']
    // rules that don't have a host match in the trackers file. We can't add these
    // but we can write them to a file a save for later
    let unMatchedRules = []

    Object.keys(rulesToAdd).forEach(host => {
        let foundTracker = false

        trackerCategories.forEach(c => {
            if (trackers[c][host]) {
                foundTracker = true

                addToLog({type: 'added', count: rulesToAdd[host][program.ruleType].length})

                // if we don't have existing rules for this tracker the no need to merge rules
                if (!trackers[c][host][program.ruleType]) {
                    trackers[c][host][program.ruleType] = rulesToAdd[host][program.ruleType]
                } else {
                    trackers[c][host][program.ruleType] = mergeTrackerEntry(
                        rulesToAdd[host][program.ruleType], 
                        trackers[c][host][program.ruleType]
                    )
                }
            }
        })

        if (!foundTracker) {
            unMatchedRules.push(rulesToAdd[host])
            addToLog({type: 'unmatched', count: rulesToAdd[host][program.ruleType].length, domains: [host]})
        }
    })

    console.log(chalk.green(`\nAdded ${filterStats.added ? filterStats.added.count : 0} new rules. Skipped ${filterStats.unmatched ? filterStats.unmatched.count : 0} filters for sites we don't block\n`))
    fs.writeFileSync('new-trackersWithParentCompany.json', JSON.stringify(trackers, null, 4))
    console.log("Wrote new trackers file to: new-trackersWithParentCompany.json")
    fs.writeFileSync('unMatchedRules.json', JSON.stringify(unMatchedRules, null, 4))
    console.log("Wrote unmatched rules to: unMatchedRules.json")
    fs.writeFileSync('log.json', JSON.stringify(filterStats, null, 4))
    console.log("Wrote summary to: log.json")
}

// merge rule lists for a single tracker
function mergeTrackerEntry (newRules, existingRules) {
    let result = []
    let mergedRuleKeys = {}

    // loop through 'a', then look for a matching rule in 'b'. If a match is found, merge, otherwise
    // just use the new 'a' rule
    newRules.forEach(newRule => {
        let combined
        existingRules.some(oldRule => {
            if (newRule.rule === oldRule.rule) {
                mergedRuleKeys[oldRule.rule] = 1

                // there can be cases where an existing url has domain options but the new rule doesn't. In this
                // case we assume that the new rule is meant to replace the old rule domains. Print out a log just incase this isn't intended 
                if ((oldRule.options && oldRule.options.domains)
                    && !(newRule.options && newRule.options.domains)) {
                        chalk.red(`New rule overrides domains optons for existing rule: ${JSON.stringify(oldRule)}`)
                        return combined = newRule
                }

                return combined = merge(newRule, oldRule, { arrayMerge: (b,c) => _.union(b,c) })
            }
        })
        // add either the combined rule or the new rule
        combined ? result.push(combined) : result.push(newRule)
    })

    // loop through the old rule list and find old rules that we didn't merge above. 
    // these need to be added to the list so that we keep all the old rules too.
    existingRules.forEach(r => {
        if (!mergedRuleKeys[r.rule]) {
            result.push(r)
        }
    })

    return result
}

function parseFilter (filter) {
    let rule = {}
    let optionStr = ''

    // check that this is a filter we currently support parsing
    // Only host anchored filters are supported right now. '||'
    if (!filter.match(/^\|\|/)) {
        printLog(`Unsuported filter: ${filter}`)
        addToLog({type: 'unsupported', count: 1, filter: [filter]})
        return false
    }

    // find the index of the filter options, if any
    let optionIndex = filter.lastIndexOf('$')

    // separate the filter from the option string
    if (optionIndex !== -1) {
        optionStr = filter.substr(optionIndex+1)
        // skip options with first-party, we would never block these
        if (optionStr.match('first-party')) {
            printLog(`Skipping first-party filter: ${filter}`)
            return false
        }

        filter = filter.substr(0,optionIndex)
    }

    // remove host anchors
    filter = filter.replace(/\|\|/,'')

    // escape some chars for json, ()/?.|
    filter = filter.replace(/(\(|\)|\/|\?|\.|\||\[)/g,'\\$1')

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
    assert.doesNotThrow(() => new RegExp(filter), `invalid regex: ${filter}`)
    
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

    optionList.forEach(o => {
        // skip third party option. All of our rules
        // are by default third party
        if (!o || o.match("third-party")) {
            return 
        }

        // look for domain list indicator 
        if (o.match(/^domain=/)) {
            // Turn domain list to array, skip domains with negation '~'
            options.domains = o.replace('domain=', '').split('|').filter(d => !d.startsWith('~'))
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

    Object.keys(rules).forEach(r => {
        if (!r) return 

        const host = rules[r].tldObj.domain || rules[r].tldObj.hostname

        // drop tldObj, we don't need it anymore
        delete rules[r].tldObj

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

function addToLog (ops) {
    if (!filterStats[ops.type]) {
        filterStats[ops.type] = {count: 0, filters: [], domains: []}
    }

    filterStats[ops.type].count += ops.count
    
    if (ops.filter) {
        filterStats[ops.type].filters = filterStats[ops.type].filters.concat(ops.filter)
    }

    if (ops.domains) {
        filterStats[ops.type].domains = filterStats[ops.type].domains.concat(ops.domains).sort()
    }
    return
}

function printLog (message) {
    if (program.verbose) {
        console.log(message)
    }
}
