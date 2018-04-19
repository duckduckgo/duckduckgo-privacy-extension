const listManager = require('./shared/list-manager')
const program = require('commander')
const fs = require('fs')
const execSync = require('child_process').execSync
const chalk = require('chalk')

const Grade = require('../src/classes/grade')
const https = require('../src/https')
const trackers = require('../src/trackers')
const surrogates = require('../src/surrogates')

const run = async (outputName) => {
    // load any lists and plug them into any classes that wait for them
    await listManager.loadLists()
    https.init(listManager.getList('https'))
    trackers.init({
        entityList: listManager.getList('entityList'),
        whitelist: listManager.getList('whitelist')
    })
    surrogates.init(listManager.getList('surrogates'))

    // get initial file data
    let outputDir = `${outputName}-grades`
    let siteDataFiles = fs.readdirSync(`sites`)

    execSync(`mkdir -p ${outputDir}`)

    for (let fileName of siteDataFiles) {
        let path = `${outputDir}/${fileName}`
        let fileExists
        let siteData = require(`${process.cwd()}/sites/${fileName}`)
        let hostname = fileName.replace(/\.json$/, '')

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

            if (tracker && tracker.block) {
                grade.update({ trackerBlocked: tracker })
            }
        })

        if (https.canUpgradeHost(hostname)) {
            grade.update({ hasHTTPS: true })
        }

        let gradeData = grade.get()

        gradeData.decisions = grade.decisions

        console.log(chalk.green(`got grade for ${hostname}: before ${gradeData.before}, after ${gradeData.after}`))

        fs.writeFileSync(`${outputDir}/${fileName}`, JSON.stringify(gradeData))
    }
}

program
    .arguments('<outputName>')
    .action(run)
    .parse(process.argv)
