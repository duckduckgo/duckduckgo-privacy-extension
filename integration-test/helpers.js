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

    for (let t of targets) {
        let url = await t.url()

        if (url.match(/ogigmfedpbpnnbcpgjloacccaibkaoip/)) {
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
    execSync('rm -rf temp-profile-*')
}

module.exports = {
    setup,
    teardown,
    wait
}
