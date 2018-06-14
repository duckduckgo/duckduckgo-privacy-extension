const listManager = require('./shared/list-manager')
const program = require('commander')
const fs = require('fs')
const execSync = require('child_process').execSync
const chalk = require('chalk')
const fileManager = require('shared/file-manager')

const trackers = require('../src/trackers')
const surrogates = require('../src/surrogates')

program
    .option('-i, --input <name>', 'The name to use when looking for sites, e.g. "test" will look in "test-sites"')
    .option('-o, --output <name>', 'Output name, e.g. "test" will output files at "test-grades"')
    .option('-f, --file <name>', 'Allow processing a subset of dumped site data, defined in a file')
    .parse(process.argv)

const input = program.input
const inputPath = `${input}-requests`
const output = program.output
const outputPath = `${output}-trackers`
const fileForSubset = program.file

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
    let siteDataArray = fileManager.getSiteData(inputPath, outputPath, fileForSubset)

    for (let siteData of siteDataArray) {
        let url = siteData.url
        let hostname = url.replace(/https?:\/\//, '')

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

run()
