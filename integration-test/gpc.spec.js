import http from 'http'
import fs from 'fs'
import path from 'path'

import { test, expect } from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'

function setupServer (redirects, port) {
    return http.createServer(function (req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`)
        fs.readFile(path.join(__dirname, 'data', 'pages', url.pathname), (err, data) => {
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

test('Ensure GPC is injected into frames', async ({ context, page, manifestVersion }) => {
    const frameTests = [
        'http://127.0.0.1:8081',
        'http://127.0.0.1:8080'
    ]
    let server
    let server2
    try {
        server = setupServer({}, 8080)
        server2 = setupServer({}, 8081)
        await backgroundWait.forExtensionLoaded(context)

        for (const iframeHost of frameTests) {
            // Load an page with an iframe from a different hostname
            await page.goto(`http://127.0.0.1:8080/index.html?host=${iframeHost}`, { waitUntil: 'networkidle' })
            const gpc = await getGPCValueOfContext(page)

            const iframeInstance = page.frames().find(iframe => iframe.url() === iframeHost + '/framed.html')
            const gpc2 = await getGPCValueOfContext(iframeInstance)

            expect(gpc).toEqual(true)
            expect(gpc).toEqual(gpc2)
        }

        // FIXME - chrome.scripting API is not yet injecting into about:blank
        //         frames correctly. See https://crbug.com/1360392.
        if (manifestVersion === 2) {
            // Load an page with an iframe from a different hostname
            await page.goto('http://127.0.0.1:8080/blank_framer.html', { waitUntil: 'networkidle' })
            const gpc = await getGPCValueOfContext(page)

            const iframeInstance = page.frames().find(iframe => iframe.url() === 'about:blank')
            const gpc2 = await getGPCValueOfContext(iframeInstance)

            expect(gpc).toEqual(true)
            expect(gpc).toEqual(gpc2)
        }
    } finally {
        server.close()
        server2.close()
    }
})
