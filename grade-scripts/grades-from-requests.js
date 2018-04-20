const listManager = require('./shared/list-manager')
const program = require('commander')
const fs = require('fs')
const execSync = require('child_process').execSync
const chalk = require('chalk')

const Grade = require('../src/classes/grade')
const https = require('../src/https')
const trackers = require('../src/trackers')
const surrogates = require('../src/surrogates')

program
    .option('-i, --input <name>', 'The name to use when looking for sites, e.g. "test" will look in "test-sites"')
    .option('-o, --output <name>', 'Output name, e.g. "test" will output files at "test-grades"')
    .parse(process.argv)

const input = program.input
const inputPath = `${input}-sites`
const output = program.output
const outputPath = `${output}-grades`

const run = async () => {
    // load any lists and plug them into any classes that wait for them
    await listManager.loadLists()
    https.addLists(listManager.getList('https'))
    trackers.addLists({
        entityList: listManager.getList('entityList'),
        whitelist: listManager.getList('whitelist')
    })
    surrogates.addLists(listManager.getList('surrogates'))

    // get initial file data
    let siteDataFiles = fs.readdirSync(inputPath)

    execSync(`mkdir -p ${outputPath}`)

    for (let fileName of siteDataFiles) {
        let path = `${outputPath}/${fileName}`
        let fileExists
        let siteData = require(`${process.cwd()}/${inputPath}/${fileName}`)
        let hostname = fileName.replace(/\.json$/, '')

        let trackersBlocked = {}
        let trackersNotBlocked = {}

        try {
            fileExists = fs.existsSync(path)
        } catch (e) {
            // ¯\_(ツ)_/¯
        }

        if (fileExists) {
            console.log(`grade file exists for ${hostname}, skipping`)
            continue
        }

        let grade = new Grade('', hostname)

        // requests are stored as a tuple like: [url, requestType]
        siteData.requests.forEach((request) => {
            let tracker = trackers.isTracker(request[0], hostname, request[1])

            if (tracker) {
                if (tracker.block) {
                    grade.update({ trackerBlocked: tracker })

                    if (!trackersBlocked[tracker.parentCompany]) {
                        trackersBlocked[tracker.parentCompany] = {}
                    }
                    trackersBlocked[tracker.parentCompany][tracker.url] = tracker
                } else {
                    if (!trackersNotBlocked[tracker.parentCompany]) {
                        trackersNotBlocked[tracker.parentCompany] = {}
                    }
                    trackersNotBlocked[tracker.parentCompany][tracker.url] = tracker
                }
            }
        })

        if (https.canUpgradeHost(hostname)) {
            grade.update({ hasHTTPS: true })
        }

        let gradeData = grade.get()

        gradeData.url = `http://${hostname}`
        gradeData.decisions = grade.decisions
        gradeData.trackersBlocked = trackersBlocked
        gradeData.trackersNotBlocked = trackersNotBlocked
        gradeData.totalBlocked = grade.totalBlocked

        console.log(chalk.green(`got grade for ${hostname}: before ${gradeData.before}, after ${gradeData.after}, ${grade.totalBlocked} trackers blocked`))

        fs.writeFileSync(`${outputPath}/${fileName}`, JSON.stringify(gradeData))
    }
}

run()
