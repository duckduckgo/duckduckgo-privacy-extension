const puppeteer = require('puppeteer')
const listManager = require('./shared/list-manager')
const utils = require('./shared/utils')
const program = require('commander')
const fs = require('fs')
const execSync = require('child_process').execSync
const chalk = require('chalk')

const https = require('../src/https')
const trackers = require('../src/trackers')
const surrogates = require('../src/surrogates')

let browser

const handleRequest = (requests, siteToCheck, request) => {
    let url = request.url()
    let type = request.resourceType()

    // we don't care about main frame requests
    if (type === 'document') {
        request.continue()
        return
    }

    requests.push([url, type])

    let upgradedUrl = https.getUpgradedUrl(url)

    if (url !== upgradedUrl) {
        url = upgradedUrl
    }

    let tracker = trackers.isTracker(url, siteToCheck, type)

    if (tracker && tracker.block) {
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

const setup = async () => {
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

    execSync(`mkdir -p sites`)
}

const teardown = async () => {
    await browser.close()
}

const getSiteData = async (siteToCheck) => {
    const page = await browser.newPage()
    const url = `http://${siteToCheck}`
    let requests = []

    await page.setRequestInterception(true)
    page.on('request', handleRequest.bind(null, requests, siteToCheck))
    page.on('response', (response) => {
        if (!utils.responseIsOK(response)) {
            console.log(chalk.red(`got ${response.status()} for ${response.url()}`))
        }
    })

    // wait for the page to load and then an extra 3s, to be sure
    try {
        await page.goto(url, { timeout: 10000, waitUntil: 'load' })
    } catch (e) {
        console.log(chalk.red(`timed out for ${url}`))
    }
    await page.waitFor(3000)

    return { url, requests }
}

const run = async (filename) => {
    let sites

    try {
        sites = fs.readFileSync(filename, { encoding: 'utf8' }).trim().split('\n')
    } catch (e) {
        console.log(chalk.red(`Error getting sites from file ${filename}: ${e.message}`))
        return
    }

    await setup()

    for (let siteToCheck of sites) {
        let path = `sites/${siteToCheck}.json`
        let fileExists

        try {
            fileExists = fs.existsSync(path)
        } catch (e) {
            // ¯\_(ツ)_/¯
        }

        if (fileExists) {
            console.log(`dump file exists for ${siteToCheck}, skipping`)
            continue
        }

        let data = await getSiteData(siteToCheck)

        if (!data.requests.length) {
            console.log(chalk.red(`couldn't get requests for ${siteToCheck}`))
            continue
        }

        console.log(chalk.green(`got ${data.requests.length} requests for ${siteToCheck}`))

        fs.writeFileSync(`sites/${siteToCheck}.json`, JSON.stringify(data))
    }

    await teardown()
}

program
    .arguments('<filename>')
    .action(run)
    .parse(process.argv)
