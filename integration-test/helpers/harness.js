const puppeteer = require('puppeteer')
const spawnSync = require('child_process').spawnSync
const tempy = require('tempy')

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000
if (process.env.KEEP_OPEN) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000 * 1000
}

const DATA_DIR_PREFIX = 'ddg-temp'

const setup = async (ops) => {
    ops = ops || {}

    const dataDir = tempy.directory({ prefix: DATA_DIR_PREFIX })
    const puppeteerOps = {
        args: [
            '--disable-extensions-except=build/chrome/dev',
            '--load-extension=build/chrome/dev',
            `--user-data-dir=${dataDir}`
        ],
        headless: false
    }

    // github actions
    if (process.env.CI) {
        puppeteerOps.args.push('--no-sandbox')
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

    async function teardown (browser, dataDir) {
        if (process.env.KEEP_OPEN) {
            return new Promise((resolve) => {
                browser.on('disconnected', async () => {
                    await teardownInternal(browser, dataDir)
                    resolve()
                })
            })
        } else {
            await teardownInternal(browser, dataDir)
        }
    }

    async function teardownInternal (browser, dataDir) {
        browser && await browser.close()

        // necessary so e.g. local storage
        // doesn't carry over between test runs
        //
        // irrelevant on travis, where everything is clear with each new run
        if (dataDir.includes(DATA_DIR_PREFIX)) {
            spawnSync('rm', ['-rf', dataDir])
        }
    }

    return { browser, bgPage, requests, teardown }
}

module.exports = {
    setup
}
