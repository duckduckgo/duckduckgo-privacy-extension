const puppeteer = require('puppeteer')
const execSync = require('child_process').execSync

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000

const setup = async (ops) => {
    ops = ops || {}

    const puppeteerOps = {
        args: [
            '--disable-extensions-except=build/chrome/dev',
            '--load-extension=build/chrome/dev',
            `--user-data-dir=temp-profile-${Math.random()}`
        ],
        headless: false
    }

    if (process.env.TRAVIS) {
        // travis requires this to work
        puppeteerOps.args.push('--no-sandbox')

        // use the latest stable or beta Chrome versions on Travis
        // rather than the bundled one
        if (process.env.CHROME_CHANNEL === 'beta') {
            puppeteerOps.path = 'google-chrome-beta'
        } else if (process.env.CHROME_CHANNEL === 'stable') {
            puppeteerOps.path = 'google-chrome-stable'
        }
    }

    const browser = await puppeteer.launch(puppeteerOps)
    // for some reason we need to init a blank page
    // before the extension is initialized
    await browser.newPage()
    const targets = await browser.targets()
    let bgPage

    // grab a handle on the background page for the extension
    // we can't use the long ID as it could possibly change
    for (const t of targets) {
        const title = t._targetInfo.title

        if (title === 'DuckDuckGo Privacy Essentials') {
            bgPage = await t.page()
            break
        }
    }

    if (!bgPage) {
        throw new Error('couldn\'t get background page')
    }

    const requests = []

    bgPage.on('request', (req) => { requests.push(req.url()) })

    return { browser, bgPage, requests }
}

const teardown = async (browser) => {
    browser && await browser.close()

    // necessary so e.g. local storage
    // doesn't carry over between test runs
    //
    // irrelevant on travis, where everything is clear with each new run
    if (!process.env.TRAVIS) {
        execSync('rm -rf temp-profile-*')
    }
}

module.exports = {
    setup,
    teardown
}
