const listManager = require('./shared/list-manager')
const program = require('commander')
const fs = require('fs')
const execSync = require('child_process').execSync
const chalk = require('chalk')

const Grade = require('../src/classes/grade')
const https = require('../src/https')
const trackers = require('../src/trackers')
const surrogates = require('../src/surrogates')
const privacyPolicy = require('../src/privacy-policy')
const scriptUtils = require('./shared/utils')

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
    privacyPolicy.addLists({
        tosdr: require('../data/generated/tosdr'),
        polisis: require('../data/generated/polisis')
    })

    execSync(`mkdir -p ${outputPath}`)

    // get initial file data
    let siteDataArray = scriptUtils.getSiteData(inputPath, fileForSubset)

    for (let siteData of siteDataArray) {
        let url = siteData.url
        let hostname = url.replace(/https?:\/\//, '')

        if (scriptUtils.dataFileExists(hostname, outputPath)) continue

        siteData.https = https.canUpgradeHost(hostname)
        siteData.httpsAutoUpgrade = https.hostAutoUpgrades(hostname)
        siteData.privacyScore = privacyPolicy.getScoreForUrl(url)

        let grade = new Grade(siteData)

        grade.calculate()

        let gradeData = grade.getGrades()

        siteData.score = gradeData
        siteData.privacy = privacyPolicy.getReasonsForUrl(url)

        console.log(chalk.green(`got grade for ${hostname}: before ${gradeData.site.grade}, after ${gradeData.enhanced.grade}`))

        fs.writeFileSync(`${outputPath}/${hostname}.json`, JSON.stringify(siteData))
    }
}

const generateCsv = () => {
    let csvText = `domain,site https,enhanced https,site trackers,enhanced trackers,privacy,site score,enhanced score,site grade,enhanced grade`

    // init values for histogram
    const gradeLetters = ['A+','A','A-','B+','B','B-','C+','C','C-','D-','D','D+','F']
    let grades = {}

    gradeLetters.forEach(letter => grades[letter] = 0)

    let siteDataArray = scriptUtils.getSiteData(outputPath, fileForSubset)

    siteDataArray.forEach((siteData) => {
        let site = siteData.score.site
        let enhanced = siteData.score.enhanced
        csvText += `\n`
        csvText += [
            siteData.url,
            site.httpsScore,
            enhanced.httpsScore,
            site.trackerScore,
            enhanced.trackerScore,
            site.privacyScore,
            site.score,
            enhanced.score,
            site.grade,
            enhanced.grade
        ]

        grades[site.grade] += 1
    })

    console.log(JSON.stringify(grades))

    fs.writeFileSync(`${output}-grades.csv`, { encoding: 'utf8' })
}

run()
    .then(generateCsv)
