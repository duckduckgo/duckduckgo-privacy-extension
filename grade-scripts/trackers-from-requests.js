const listManager = require('./shared/list-manager')
const program = require('commander')
const fs = require('fs')
const execSync = require('child_process').execSync
const chalk = require('chalk')
const entityMap = require('../data/generated/entity-map')
const utils = require('../src/utils')
const scriptUtils = require('./shared/utils')

const trackers = require('../src/trackers')
const surrogates = require('../src/surrogates')

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

if (!input || !output) {
    return program.help()
}

const run = async () => {
    // load any lists and plug them into any classes that wait for them
    await listManager.loadLists()
    trackers.addLists({
        entityList: listManager.getList('entityList'),
        whitelist: listManager.getList('whitelist')
    })
    surrogates.addLists(listManager.getList('surrogates'))

    execSync(`mkdir -p ${outputPath}`)

    // get initial file data
    let siteDataArray = scriptUtils.getSiteData(inputPath, fileForSubset)

    for (let siteData of siteDataArray) {
        let url = siteData.url
        let hostname = url.replace(/https?:\/\//, '')

        if (scriptUtils.dataFileExists(hostname, outputPath)) continue

        let trackersBlocked = {}
        let trackersNotBlocked = {}
        let totalBlocked = 0

        // requests are stored as a tuple like: [url, requestType]
        siteData.requests.forEach((request) => {
            let tracker = trackers.isTracker(request[0], url, request[1])

            if (tracker) {
                if (tracker.block) {
                    if (!trackersBlocked[tracker.parentCompany]) {
                        trackersBlocked[tracker.parentCompany] = {}
                    }
                    trackersBlocked[tracker.parentCompany][tracker.url] = tracker
                    totalBlocked += 1
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
            totalBlocked
        }

        if (siteData.rank) {
            outputData.rank = siteData.rank
        }

        fs.writeFileSync(`${outputPath}/${hostname}.json`, JSON.stringify(outputData))
    }
}

const calculateTrackerPrevalence = () => {
    console.log('calculating tracker prevalence data...')

    // get all the files that we've just processed
    let siteDataArray = scriptUtils.getSiteData(outputPath)
    let entityList = listManager.getList('entityList')

    let networksSeen = {}

    // count up all the tracker networks seen on each site
    siteDataArray.forEach((siteData) => {
        let networksOnThisSite = {}

        // get all the tracker networks seen on a specific site
        Object.keys(siteData.trackersBlocked).forEach((network) => {
            Object.keys(siteData.trackersBlocked[network]).forEach((trackerUrl) => {
                let parent = entityList[trackerUrl] || network
                networksOnThisSite[parent] = true
            })
        })
        Object.keys(siteData.trackersNotBlocked).forEach((network) => {
            Object.keys(siteData.trackersNotBlocked[network]).forEach((trackerUrl) => {
                let parent = entityList[trackerUrl] || network
                networksOnThisSite[parent] = true
            })
        })

        // add them to the global counts
        Object.keys(networksOnThisSite).forEach((network) => {
            if (network === 'unknown') return

            if (!networksSeen[network]) {
                networksSeen[network] = 0
            }

            networksSeen[network] += 1
        })
    })

    // calculate overall prevalence
    let networkPrevalence = {}
    let totalSites = siteDataArray.length

    Object.keys(networksSeen).forEach((network) => {
        let percent = networksSeen[network] / totalSites * 100
        // round to 2 significant digits
        percent = Math.round(percent * 100) / 100

        networkPrevalence[network] = percent
    })

    // write the prevalence to file, then add it to all the file data
    fs.writeFileSync(`data/generated/prevalence.json`, JSON.stringify(networkPrevalence))

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
