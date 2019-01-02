const listManager = require('./shared/list-manager')
const program = require('commander')
const fs = require('fs')
const execSync = require('child_process').execSync
const chalk = require('chalk')
const entityMap = require('../data/generated/entity-map')
const utils = require('../src/utils')
const scriptUtils = require('./shared/utils')
const trackers = require('../src/trackers')

program
    .option('-i, --input <name>', 'The name to use when looking for sites, e.g. "test" will look in "test-sites" (required)')
    .option('-o, --output <name>', 'Output name, e.g. "test" will output files at "test-grades" (required)')
    .option('-f, --file <name>', 'Allow processing a subset of dumped site data, defined in a file')
    .parse(process.argv)

const input = program.input
const inputPath = `${input}-sites`
const output = program.output
const outputPath = `${output}-trackers`
const fileForSubset = program.file

const ACTION_BLOCK = 'block';
const ACTION_REDIRECT = 'redirect';

// total time sec
let duration = 0

if (!input || !output) {
    return program.help()
}

const run = async () => {
    // load any lists and plug them into any classes that wait for them
    await listManager.loadLists()
    trackers.addLists({
        entityList: listManager.getList('entityList'),
        trackerList: listManager.getList('trackerList'),
        surrogates: listManager.getList('surrogates')
    })

    execSync(`mkdir -p ${outputPath}`)

    // get initial file data
    const siteDataArray = scriptUtils.getSiteData(inputPath, fileForSubset)

    for (let siteData of siteDataArray) {
        if (siteData.failed) continue

        const url = siteData.url
        const hostname = url.replace(/https?:\/\//, '')

        if (scriptUtils.dataFileExists(hostname, outputPath)) continue

        let trackersBlocked = {}
        let trackersNotBlocked = {}
        let totalBlocked = 0
        let requestsBlocked = []
        let rulesUsed = new Map()

        siteData.requests.forEach(([trackerUrl, requestType]) => {
            const start = process.hrtime()
            const trackerData = trackers.getTrackerData(trackerUrl, url, {url: trackerUrl, type: requestType})

            // add time to process tracker to total time, convert to sec first
            const [sec, ns] = process.hrtime(start)
            duration += (sec + ns/Math.pow(10, 9))

            if (trackerData) {
                const tracker = trackerData.tracker

                if (trackerData.action === ACTION_BLOCK || trackerData.action === ACTION_REDIRECT) {
                    totalBlocked += 1
                    
                    if (!trackersBlocked[tracker.owner.name]) {
                        trackersBlocked[tracker.owner.name] = {}
                    }
                    
                    trackersBlocked[tracker.owner.name][tracker.domain] = tracker
                    requestsBlocked.push(trackerUrl)
                } else {

                    if (!trackersNotBlocked[tracker.owner.name]) {
                        trackersNotBlocked[tracker.owner.name] = {}
                    }
                    trackersNotBlocked[tracker.owner.name][tracker.domain] = tracker
                }

                // update rule count and urls for this matched rule
                if (trackerData.matchedRule) {
                    const rule = trackerData.matchedRule.rule.toString()
                    
                    const ruleObj = rulesUsed.get(rule) || {count: 0, urls: {}}
                    ruleObj.count += 1
                    ruleObj.urls[trackerUrl] = ruleObj.urls[trackerUrl] ? ruleObj.urls[trackerUrl] + 1 : 1
                    rulesUsed.set(rule, ruleObj)
                }
            }
        })

        console.log(chalk.green(`${url}: ${totalBlocked} trackers`))
        
        let outputData = {
            url: siteData.url,
            trackersBlocked,
            trackersNotBlocked,
            totalBlocked,
            reqBlocked: requestsBlocked,
            rulesUsed: JSON.parse(JSON.stringify([...rulesUsed]))
        }

        if (siteData.rank) {
            outputData.rank = siteData.rank
        }

        fs.writeFileSync(`${outputPath}/${hostname}.json`, JSON.stringify(outputData))
    }

    console.log(chalk.green(`Total time: ${duration} sec`))
}

const calculateTrackerPrevalence = () => {
    console.log('adding tracker prevalence data...')

    // get all the files that we've just processed
    // and add tracker prevalence to them
    let siteDataArray = scriptUtils.getSiteData(outputPath)
    let networkPrevalence = require(`../data/generated/prevalence.json`)

    siteDataArray.forEach((siteData) => {
        let hostname = siteData.url.replace(/https?:\/\//, '')

        siteData.parentEntity = utils.findParent(hostname.split('.')) || ''
        siteData.prevalence = networkPrevalence[siteData.parentEntity] || 0

        Object.keys(siteData.trackersBlocked).forEach((network) => {
            siteData.trackersBlocked[network].prevalence = networkPrevalence[network]
        })
        Object.keys(siteData.trackersNotBlocked).forEach((network) => {
            siteData.trackersNotBlocked[network].prevalence = networkPrevalence[network]
        })

        fs.writeFileSync(`${outputPath}/${hostname}.json`, JSON.stringify(siteData))
    })

    console.log('done!')
}

run()
    .then(calculateTrackerPrevalence)
