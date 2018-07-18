const puppeteer = require('puppeteer')
const execSync = require('child_process').execSync

const wait = async (ms) => {
    return new Promise((resolve) => { setTimeout(resolve, ms) })
}

const setup = async (ops) => {
    ops = ops || {}

    let args = [
        '--disable-extensions-except=build/chrome/dev',
        '--load-extension=build/chrome/dev',
        `--user-data-dir=temp-profile-${Math.random()}`
    ]

    // travis requires this to work
    if (process.env.TRAVIS) {
        args.push('--no-sandbox')
    }

    if (ops.withSuccessPage) {
        args.push('https://duckduckgo.com/?exti=2')
    }

    const browser = await puppeteer.launch({
        headless: false,
        args
    })
    // for some reason we need to init a blank page
    // before the extension is initialized
    await browser.newPage()
    const targets = await browser.targets()
    let bgPage

    // grab a handle on the background page for the extension
    // we can't use the long ID as it could possibly change
    for (let t of targets) {
        let title = t._targetInfo.title

        if (title === 'DuckDuckGo Privacy Essentials') {
            bgPage = await t.page()
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
    teardown,
    wait
}
