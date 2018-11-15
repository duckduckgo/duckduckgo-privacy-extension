const listManager = require('./shared/list-manager')
const program = require('commander')
const fs = require('fs')
const execSync = require('child_process').execSync
const chalk = require('chalk')
const entityMap = require('../data/generated/entity-map')
const utils = require('../src/utils')
const scriptUtils = require('./shared/utils')

const surrogates = require('../src/surrogates')

program
    .option('-i, --input <name>', 'The name to use when looking for sites, e.g. "test" will look in "test-sites" (required)')
    .option('-o, --output <name>', 'Output name, e.g. "test" will output files at "test-grades" (required)')
    .option('-f, --file <name>', 'Allow processing a subset of dumped site data, defined in a file')
    .option('-t, --tracker <name>', 'Name of tracker module to load')
    .parse(process.argv)

const trackers = require(`../src/${program.tracker}`)
const input = program.input
const inputPath = `${input}-sites`
const output = program.output
const outputPath = `${output}-trackers`
const fileForSubset = program.file

if (!input || !output) {
    return program.help()
}

const run = async () => {
    // load any lists and plug them into any classes that wait for them
    await listManager.loadLists()
    trackers.addLists({
        entityList: listManager.getList('entityList'),
        trackerList: listManager.getList('trackerList'),
        whitelists: {trackersWhitelist: { data: listManager.getList('whitelists'), parsed: {}}}
    })
    surrogates.addLists(listManager.getList('surrogates'))

    execSync(`mkdir -p ${outputPath}`)

    // get initial file data
    let siteDataArray = scriptUtils.getSiteData(inputPath, fileForSubset)

    for (let siteData of siteDataArray) {
        if (siteData.failed) continue

        let url = siteData.url
        let hostname = url.replace(/https?:\/\//, '')

        if (scriptUtils.dataFileExists(hostname, outputPath)) continue

        let trackersBlocked = {}
        let trackersNotBlocked = {}
        let totalBlocked = 0
        let requestsBlocked = []
        // requests are stored as a tuple like: [url, requestType]
        siteData.requests.forEach((request) => {
            const t = process.hrtime()
            const tracker = trackers.isTracker(request[0], url, {url: request[0], type: request[1]})
            const time = process.hrtime(t);

            if (tracker) {
                tracker.time = time
                if (tracker.block) {
                    if (!trackersBlocked[tracker.parentCompany]) {
                        trackersBlocked[tracker.parentCompany] = {}
                    }
                    trackersBlocked[tracker.parentCompany][tracker.url] = tracker
                    totalBlocked +=1
                    requestsBlocked.push(request[0])
                } else {
                    if (!trackersNotBlocked[tracker.parentCompany]) {
                        trackersNotBlocked[tracker.parentCompany] = {}
                    }
                    trackersNotBlocked[tracker.parentCompany][tracker.url] = tracker
                }
            }
        })

        console.log(chalk.green(`${url}: ${totalBlocked} trackers`))

        let outputData = {
            url: siteData.url,
            trackersBlocked,
            trackersNotBlocked,
            totalBlocked,
            reqBlocked: requestsBlocked
        }

        if (siteData.rank) {
            outputData.rank = siteData.rank
        }

        fs.writeFileSync(`${outputPath}/${hostname}.json`, JSON.stringify(outputData))
    }
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
