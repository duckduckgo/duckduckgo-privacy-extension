/**
 *  Tests for fingerprinting, these tests load a example website server.
 */

const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')
const http = require('http')
const fs = require('fs')
const path = require('path')

let browser
let bgPage
let teardown

describe('Canvas verification', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
    })
    afterAll(async () => {
        await teardown()
    })

    it('Canvas drawing should be different per hostname', async () => {
        const hostnames = [
            'bad.third-party.site',
            'good.third-party.site',
            'broken.third-party.site'
        ]
        const hostnameResults = {}
        for (const hostname of hostnames) {
            const page = await browser.newPage()
            await pageWait.forGoto(page, `https://${hostname}/features/canvas-draw.html`)
            // Wait for injection; will be resolved with MV3 changes
            await page.waitForFunction(
                () => navigator.globalPrivacyControl,
                { polling: 100, timeout: 6000 }
            )
            await page.evaluate(() => {
                document.getElementById('draw-same').click()
            })
            await page.waitForFunction(
                () => results && results.complete,
                { polling: 100, timeout: 6000 }
            )
            const results = await page.evaluate(() => results)
            results.results.forEach((a) => {
                if (!(a.id in hostnameResults)) {
                    hostnameResults[a.id] = new Set()
                }
                hostnameResults[a.id].add(a.value)
            })
        }

        // Check that we have unique values for each hostname in the sets
        for (const key in hostnameResults) {
            expect(hostnameResults[key].size).toEqual(hostnames.length, `${key} must be different for all ${hostnames.length} hostnames`)
        }
    })

    it('Canvas should pass all verification tests', async () => {
        const page = await browser.newPage()
        await pageWait.forGoto(page, 'https://bad.third-party.site/privacy-protections/fingerprinting/canvas.html?run')
        await page.waitForFunction(
            () => results && results.complete,
            { polling: 100, timeout: 6000 }
        )
        const results = await page.evaluate(() => results)

        expect(results.didFail).toEqual(false)
        // Help debug the error
        if (results.didFail) {
            expect(results.fails).toEqual([])
        }
    })
})

function setupServer (redirects, port) {
    return http.createServer(function (req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`)
        fs.readFile(path.join(__dirname, 'pages', url.pathname), (err, data) => {
            if (err) {
                res.writeHead(404)
                res.end(JSON.stringify(err))
                return
            }
            res.writeHead(200)
            res.end(data)
        })
    }).listen(port)
}

async function getFingerprintOfContext (ctx) {
    await ctx.addScriptTag({ path: 'node_modules/@fingerprintjs/fingerprintjs/dist/fp.js' })
    return ctx.evaluate(() => {
        /* global FingerprintJS */
        return (async () => {
            const fp = await FingerprintJS.load()
            return fp.get()
        })()
    })
}

const frameTests = [
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8080'
]
let server
let server2

describe('First Party Fingerprint Randomization', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        server = setupServer({}, 8080)
        server2 = setupServer({}, 8081)

        await backgroundWait.forAllConfiguration(bgPage)
    })
    afterAll(async () => {
        await server.close()
        await server2.close()
        await teardown()
    })

    frameTests.forEach(iframeHost => {
        it(`Embedded same/cross-origin frames should match parent (frame: ${iframeHost})`, async () => {
            const page = await browser.newPage()
            // Load a page with an iframe from a different hostname
            await pageWait.forGoto(page, `http://127.0.0.1:8080/index.html?host=${iframeHost}`)
            const fingerprint = await getFingerprintOfContext(page)

            const iframeInstance = page.frames().find(iframe => iframe.url() === iframeHost + '/framed.html')
            const fingerprint2 = await getFingerprintOfContext(iframeInstance)

            expect(fingerprint.components.canvas.value).toEqual(fingerprint2.components.canvas.value)
        })
    })
})
