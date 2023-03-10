/**
 * @typedef {object} LoggedRequestDetails
 * @property {URL} url
 *   The request's URL.
 * @property {boolean} [blocked]
 *   False if the request was successful, true if it was blocked or failed.
 * @property {string} [method]
 * @property {string} type
 * @property {string} [reason]
 * @property {'redirected' | 'allowed' | 'blocked' | 'failed'} [status]
 * @property {URL} [redirectUrl]
 * @property {string} [initiator]
 */

/**
 * Start logging requests for the given Puppeteer Page.
 * @param {import('@playwright/test').Page | import('puppeteer').Page} page
 *   The Puppeteer page to log requests for.
 * @param {LoggedRequestDetails[]} requests
 *   Array of request details, appended to as requests happen.
 *   Note: The requests array is mutated by this function.
 * @param {function} [filter]
 *   Optional filter function that (if given) should return falsey for requests
 *   that should be ignored.
 * @returns {Promise<function>}
 *   Function that clears logged requests (and in progress requests).
 */
async function logPageRequests (page, requests, filter) {
    /** @type {Map<number, LoggedRequestDetails>} */
    const requestDetailsByRequestId = new Map()
    const isPlaywright = typeof page.routeFromHAR === 'function'

    /**
   * @param {number} requestId
   * @param {(details: LoggedRequestDetails) => void} updateDetails
   * @returns {void}
   */
    const saveRequestOutcome = (requestId, updateDetails) => {
        if (!requestDetailsByRequestId.has(requestId)) {
            return
        }

        const details = requestDetailsByRequestId.get(requestId)
        requestDetailsByRequestId.delete(requestId)
        if (!details) {
            return
        }

        updateDetails(details)

        if (!filter || filter(details)) {
            requests.push(details)
        }
    }

    if (isPlaywright) {
        logRequestsPlaywright(page, requestDetailsByRequestId, saveRequestOutcome)
    } else {
        await logRequestsPuppeteer(page, requestDetailsByRequestId, saveRequestOutcome)
    }

    return () => {
        requests.length = 0
        requestDetailsByRequestId.clear()
    }
}

async function logRequestsPuppeteer (page, requestDetailsByRequestId, saveRequestOutcome
) {
    const client = await page.target().createCDPSession()
    await client.send('Network.enable')

    // HTTP requests
    client.on(
        'Network.requestWillBeSent',
        ({ requestId, request: { url, method }, redirectResponse, type }) => {
            const requestDetails = { url, method, type }

            if (
                redirectResponse &&
        redirectResponse.statusText === 'Internal Redirect' &&
        redirectResponse.headers &&
        redirectResponse.headers.Location &&
        redirectResponse.headers['Non-Authoritative-Reason'] ===
          'WebRequest API'
            ) {
                requestDetails.url = redirectResponse.url
                requestDetails.redirectUrl = new URL(redirectResponse.headers.Location)
            }
            requestDetails.url = new URL(requestDetails.url)

            requestDetailsByRequestId.set(requestId, requestDetails)
        }
    )

    client.on('Network.loadingFinished', ({ requestId }) => {
        saveRequestOutcome(requestId, (details) => {
            details.status = details.redirectUrl ? 'redirected' : 'allowed'
        })
    })

    client.on(
        'Network.loadingFailed',
        ({ requestId, blockedReason, errorText }) => {
            saveRequestOutcome(requestId, (details) => {
                if (
                    (blockedReason === 'other' &&
            errorText === 'net::ERR_BLOCKED_BY_CLIENT') ||
          (!blockedReason && errorText === 'net::ERR_ABORTED')
                ) {
                    details.status = 'blocked'
                } else {
                    details.status = 'failed'
                    details.reason = errorText
                }
            })
        }
    )

    // WebSockets
    client.on('Network.webSocketCreated', ({ requestId, url, initiator }) => {
        requestDetailsByRequestId.set(requestId, {
            url: new URL(url),
            initiator,
            type: 'websocket'
        })
    })

    client.on(
        'Network.webSocketWillSendHandshakeRequest',
        ({ requestId, request: { headers } }) => {
            saveRequestOutcome(requestId, (details) => {
                details.status = 'allowed'
            })
        }
    )

    client.on('Network.webSocketClosed', ({ requestId }) => {
        saveRequestOutcome(requestId, (details) => {
            details.status = 'blocked'
        })
    })
}

function logRequestsPlaywright (page, requestDetailsByRequestId, saveRequestOutcome) {
    page.on('request', (request) => {
        const url = request.url()
        const requestDetails = {
            url,
            method: request.method(),
            type: request.resourceType()
        }
        if (request.redirectedFrom()) {
            requestDetails.redirectUrl = request.url()
        }
        requestDetails.url = new URL(requestDetails.url)
        requestDetailsByRequestId.set(url, requestDetails)
    })
    page.on('requestfinished', (request) => {
        saveRequestOutcome(request.url(), details => {
            details.status = details.redirectUrl ? 'redirected' : 'allowed'
        })
    })
    page.on('requestfailed', (request) => {
        saveRequestOutcome(request.url(), details => {
            const { errorText } = request.failure()
            if (errorText === 'net::ERR_BLOCKED_BY_CLIENT' || errorText === 'net::ERR_ABORTED') {
                details.status = 'blocked'
                details.reason = errorText
            } else {
                details.status = 'failed'
                details.reason = errorText
            }
        })
    })
}

module.exports = {
    logPageRequests
}
