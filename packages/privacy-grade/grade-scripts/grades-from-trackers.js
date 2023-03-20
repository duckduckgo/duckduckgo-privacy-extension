const listManager = require('./shared/list-manager')
const program = require('commander')
const fs = require('fs')
const execSync = require('child_process').execSync
const chalk = require('chalk')

const Grade = require('../src/classes/grade')
const https = require('../src/https')
const privacyPolicy = require('../src/privacy-policy')
const scriptUtils = require('./shared/utils')

program
    .option('-i, --input <name>', 'The name to use when looking for sites, e.g. "test" will look in "test-sites" (required)')
    .option('-o, --output <name>', 'Output name, e.g. "test" will output files at "test-grades" (required)')
    .option('-f, --file <name>', 'Allow processing a subset of dumped site data, defined in a file')
    .parse(process.argv)

const input = program.input
const inputPath = `${input}-trackers`
const output = program.output
const outputPath = `${output}-grades`
const fileForSubset = program.file

if (!input || !output) {
    return program.help()
}

const run = async () => {
    // load any lists and plug them into any classes that wait for them
    await listManager.loadLists()
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

        let gradeData = grade.get()

        siteData.score = gradeData
        siteData.privacy = privacyPolicy.getReasonsForUrl(url)

        console.log(chalk.green(`got grade for ${hostname}: before ${gradeData.site.grade}, after ${gradeData.enhanced.grade}`))

        fs.writeFileSync(`${outputPath}/${hostname}.json`, JSON.stringify(siteData))
    }
}

const generateCsv = () => {
    let csvText = `domain,site https,enhanced https,site trackers,enhanced trackers,privacy,site score,enhanced score,site grade,enhanced grade`

    // grade histogram
    const gradeLetters = ['A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F']
    let gradeCounts = {}

    gradeLetters.forEach(letter => gradeCounts[letter] = 0)

    // score histogram, scores are numbers from 0 with no upper bound
    // so we do it as a sparse array instead
    let scoreCounts = []

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
        ].join(',')

        gradeCounts[site.grade] += 1

        if (!scoreCounts[site.score]) scoreCounts[site.score] = 0
        scoreCounts[site.score] += 1
    })

    let csvGradeHistText = `grade,count\n`
    csvGradeHistText += gradeLetters.map(letter => `${letter},${gradeCounts[letter]}`).join('\n')

    let csvScoreHistText = `score,count\n`
    for (let i = 0; i < scoreCounts.length; i++) {
        csvScoreHistText += `${i},${scoreCounts[i] || 0}\n`
    }

    console.log(JSON.stringify(gradeCounts))

    fs.writeFileSync(`${output}.csv`, csvText, { encoding: 'utf8' })
    fs.writeFileSync(`${output}.grade.hist.csv`, csvGradeHistText, { encoding: 'utf8' })
    fs.writeFileSync(`${output}.score.hist.csv`, csvScoreHistText, { encoding: 'utf8' })
}

run()
    .then(generateCsv)
