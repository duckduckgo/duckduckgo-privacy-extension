const puppeteer = require('puppeteer')
const listManager = require('./shared/list-manager')

const Grade = require('../src/classes/grade')
const https = require('../src/https')
const trackers = require('../src/trackers')
const surrogates = require('../src/surrogates')

let grade

let siteToCheck = 'reddit.com'

const handleRequest = (request) => {
    let url = request.url()

    let upgradedUrl = https.getUpgradedUrl(url)

    if (url !== upgradedUrl) {
        console.log(`https upgrade: ${upgradedUrl}`)
        url = upgradedUrl
    }

    // fake some tracker blocking for now
    let tracker = trackers.isTracker(url, siteToCheck, url.resourceType)

    if (tracker && tracker.block) {
        console.log(`blocking: ${url}`)
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

(async () => {
    // load any lists and plug them into any classes that wait for them
    await listManager.loadLists()
    https.init(listManager.getList('https'))
    trackers.init({
        entityList: listManager.getList('entityList'),
        whitelist: listManager.getList('whitelist')
    })
    surrogates.init(listManager.getList('surrogates'))

    // set up headless browser
    const browser = await puppeteer.launch({
        args: ['--no-sandbox']
    })
    const page = await browser.newPage()

    await page.setRequestInterception(true)
    page.on('request', handleRequest)

    // visit page!
    grade = new Grade('', siteToCheck)
    await page.goto(`http://${siteToCheck}`)

    // wait for the page to load and then an extra 3s
    try {
        await page.waitForNavigation({ timeout: 5000, waitUntil: 'load' })
    } catch (e) {
        console.log('timed out waiting for page load')
    }

    await page.waitFor(3000)

    // check if https
    if (page.url().indexOf('https:') === 0) {
        grade.update({ hasHttps: true })
    }

    console.log(`grade is: ${JSON.stringify(grade.get())}`)
    console.log(`number of trackers blocked: ${grade.totalBlocked}`)

    await browser.close()
})()
