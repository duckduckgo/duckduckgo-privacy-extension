const fs = require('fs')
const os = require('os')
const path = require('path')
const puppeteer = require('puppeteer')
const spawnSync = require('child_process').spawnSync

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000
if (process.env.KEEP_OPEN) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000 * 1000
}

const DATA_DIR_PREFIX = 'ddg-temp-'

const setup = async (ops) => {
    ops = ops || {}

    const loadExtension = ops.loadExtension !== false
    const tmpDirPrefix = path.join(os.tmpdir(), DATA_DIR_PREFIX)
    const dataDir = fs.mkdtempSync(tmpDirPrefix)
    const puppeteerOps = {
        args: [
            `--user-data-dir=${dataDir}`
        ],
        headless: false
    }

    if (loadExtension) {
        puppeteerOps.args.push('--disable-extensions-except=build/chrome/dev')
        puppeteerOps.args.push('--load-extension=build/chrome/dev')
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

    let bgPage
    const requests = []

    if (loadExtension) {
        // grab a handle on the background page for the extension
        // we can't use the long ID as it could possibly change
        for (const t of await browser.targets()) {
            // for some reason we need to init a blank page
            // before the extension is initialized
            await browser.newPage()

            const title = t._targetInfo.title

            if (title === 'DuckDuckGo Privacy Essentials') {
                bgPage = await t.page()
                break
            }
        }

        if (!bgPage) {
            throw new Error('couldn\'t get background page')
        }

        bgPage.on('request', (req) => { requests.push(req.url()) })
    }

    async function teardown () {
        if (process.env.KEEP_OPEN) {
            return new Promise((resolve) => {
                browser.on('disconnected', async () => {
                    await teardownInternal()
                    resolve()
                })
            })
        } else {
            await teardownInternal()
        }
    }

    async function teardownInternal () {
        await browser.close()

        // necessary so e.g. local storage
        // doesn't carry over between test runs
        spawnSync('rm', ['-rf', dataDir])
    }

    return { browser, bgPage, requests, teardown }
}

module.exports = {
    setup
}
