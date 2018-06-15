const listManager = require('./shared/list-manager')
const fileManager = require('./shared/file-manager')
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
    .option('-f, --file <name>', 'Allow processing a subset of dumped site data, defined in a file')
    .parse(process.argv)

const input = program.input
const inputPath = `${input}-trackers`
const output = program.output
const outputPath = `${output}-grades`
const fileForSubset = program.file

const run = async () => {
    // load any lists and plug them into any classes that wait for them
    await listManager.loadLists()
    trackers.addLists({
        entityList: listManager.getList('entityList'),
        whitelist: listManager.getList('whitelist')
    })
    surrogates.addLists(listManager.getList('surrogates'))
    https.addLists({
        https: listManager.getList('https'),
        httpsAutoUpgrade: listManager.getList('httpsAutoUpgrade')
    })

    execSync(`mkdir -p ${outputPath}`)

    // get initial file data
    let siteDataArray = fileManager.getSiteData(inputPath, outputPath, fileForSubset, true)

    for (let siteData of siteDataArray) {
        let url = siteData.url
        let hostname = url.replace(/https?:\/\//, '')

        siteData.https = https.canUpgradeHost(hostname)
        siteData.httpsWithAutoUpgrade = https.hostAutoUpgrades(hostname)

        // TODO privacy

        let grade = new Grade(siteData)

        grade.calculate()

        let gradeData = grade.get()

        console.log(chalk.green(`got grade for ${hostname}: before ${gradeData.before}, after ${gradeData.after}`))

        fs.writeFileSync(`${outputPath}/${hostname}.json`, JSON.stringify(gradeData))
    }
}

run()
