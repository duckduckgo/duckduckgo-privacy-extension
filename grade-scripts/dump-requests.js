const puppeteer = require('puppeteer')
const listManager = require('./shared/list-manager')

const Grade = require('../src/classes/grade')
const https = require('../src/https')

let grade

const handleRequest = (request) => {
    let url = request.url()

    // fake some tracker blocking for now
    if (url.indexOf('doubleclick.net') > -1) {
        console.log(`blocking: ${url}`)
        grade.update({
            trackerBlocked: {
                parentCompany: 'google',
                url
            }
        })
        request.abort()
    } else {
        let upgradedUrl = https.getUpgradedUrl(url)

        if (url !== upgradedUrl) {
            console.log(`https upgrade: ${upgradedUrl}`)
        }

        request.continue({
            url: url
        })
    }
}

(async () => {
    // load any lists and plug them into any classes that wait for them
    await listManager.loadLists()
    https.init(listManager.getList('https2'))

    // set up headless browser
    const browser = await puppeteer.launch({
        args: ['--no-sandbox']
    })
    const page = await browser.newPage()

    await page.setRequestInterception(true)
    page.on('request', handleRequest)

    // visit page!
    grade = new Grade('', 'theguardian.com')
    await page.goto('http://theguardian.com')

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

    await browser.close()
})()
