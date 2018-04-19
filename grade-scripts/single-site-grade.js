const puppeteer = require('puppeteer')
const listManager = require('./shared/list-manager')
const program = require('commander')
const chalk = require('chalk')

const Grade = require('../src/classes/grade')
const https = require('../src/https')
const trackers = require('../src/trackers')
const surrogates = require('../src/surrogates')

let siteToCheck
let browser
let grade

const handleRequest = (request) => {
    let url = request.url()
    let type = request.resourceType()
    let upgradedUrl = https.getUpgradedUrl(url)

    if (url !== upgradedUrl) {
        url = upgradedUrl
    }

    let tracker = trackers.isTracker(url, siteToCheck, type)

    if (tracker && tracker.block) {
        grade.update({ trackerBlocked: tracker })

        if (tracker.redirectUrl) {
            url = tracker.redirectUrl
        } else {
            request.abort()
            return
        }
    }

    request.continue({
        url: url
    })
}

const run = async () => {
    // load any lists and plug them into any classes that wait for them
    await listManager.loadLists()
    https.init(listManager.getList('https'))
    trackers.init({
        entityList: listManager.getList('entityList'),
        whitelist: listManager.getList('whitelist')
    })
    surrogates.init(listManager.getList('surrogates'))

    // set up headless browser
    browser = await puppeteer.launch({
        args: ['--no-sandbox']
    })

    const page = await browser.newPage()
    grade = new Grade('', siteToCheck)
    let requests = []

    await page.setRequestInterception(true)
    page.on('request', handleRequest)

    console.log(`getting grade for ${siteToCheck}`)
    // wait for the page to load and then an extra 3s, to be sure
    await page.goto(`http://${siteToCheck}`, { timeout: 10000, waitUntil: 'load' })
    await page.waitFor(3000)

    // check if https
    if (page.url().indexOf('https:') === 0) {
        grade.update({ hasHttps: true })
    }

    console.log(chalk.green(`grade for ${siteToCheck} is: ${JSON.stringify(grade.get())}`))
    console.log(chalk.green(`number of trackers blocked: ${grade.totalBlocked}`))

    await browser.close()
}

program
    .arguments('<hostname>')
    .action((hostname) => {
        siteToCheck = hostname

        run()
    })
    .parse(process.argv)

