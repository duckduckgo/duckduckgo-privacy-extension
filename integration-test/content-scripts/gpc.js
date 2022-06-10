/**
 *  Tests for injecting GPC into the page, these tests load a example website server.
 */

const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

let browser
let bgPage

const http = require('http')
const fs = require('fs')
const path = require('path')

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

function getGPCValueOfContext (ctx) {
    return ctx.evaluate(() => {
        return (async () => {
            return navigator.globalPrivacyControl
        })()
    })
}

const frameTests = [
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8080'
]
let server
let server2
let teardown

describe('Ensure GPC is injected into frames', () => {
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
        it(`${iframeHost} frame should match the parent frame`, async () => {
            const page = await browser.newPage()
            // Load an page with an iframe from a different hostname
            await pageWait.forGoto(page, `http://127.0.0.1:8080/index.html?host=${iframeHost}`)
            const gpc = await getGPCValueOfContext(page)

            const iframe = page.frames().find(iframe => iframe.url() === iframeHost + '/framed.html')
            const gpc2 = await getGPCValueOfContext(iframe)

            expect(gpc).toEqual(true)
            expect(gpc).toEqual(gpc2)
        })

        it(`${iframeHost} should work with about:blank injected frames`, async () => {
            const page = await browser.newPage()
            await pageWait.forGoto(page, 'http://127.0.0.1:8080/blank_framer.html')
            const gpc = await getGPCValueOfContext(page)

            const iframe = page.frames().find(iframe => iframe.url() === 'about:blank')
            const gpc2 = await getGPCValueOfContext(iframe)

            expect(gpc).toEqual(true)
            expect(gpc).toEqual(gpc2)
        })
    })
})
