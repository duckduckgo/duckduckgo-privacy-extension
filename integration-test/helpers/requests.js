/* @typedef {object} LoggedRequestDetails
 * @property {string} url
 *   The request's URL.
 * @property {bool} blocked
 *   False if the request was successful, true if it was blocked or failed.
 */

/**
 * Start logging requests for the given Puppeteer Page.
 * @param {Page} page
 *   The Puppeteer page to log requests for.
 * @param {LoggedRequestDetails[]} requests
 *   Array of request details, appended to as requests happen.
 *   Note: The requests array is mutated by this function.
 * @returns {function}
 *   Function that clears logged requests (and in progress requests).
 */
function logPageRequests (page, requests) {
    const requestDetailsByRequestId = new Map()

    page._client.on('Network.requestWillBeSent', ({
        requestId, request: { url, method }, redirectResponse, type
    }) => {
        const requestDetails = { url, method, type }

        if (redirectResponse &&
            redirectResponse.statusText === 'Internal Redirect' &&
            redirectResponse.headers && redirectResponse.headers.Location &&
            redirectResponse.headers['Non-Authoritative-Reason'] === 'WebRequest API') {
            requestDetails.url = redirectResponse.url
            requestDetails.redirectUrl = new URL(redirectResponse.headers.Location)
        }
        requestDetails.url = new URL(requestDetails.url)

        requestDetailsByRequestId.set(requestId, requestDetails)
    })

    page._client.on('Network.loadingFinished', ({ requestId }) => {
        if (!requestDetailsByRequestId.has(requestId)) {
            return
        }

        const details = requestDetailsByRequestId.get(requestId)
        requestDetailsByRequestId.delete(requestId)

        details.status = details.redirectUrl ? 'redirected' : 'allowed'
        requests.push(details)
    })

    page._client.on('Network.loadingFailed', ({
        requestId, blockedReason, errorText
    }) => {
        if (!requestDetailsByRequestId.has(requestId)) {
            return
        }

        const details = requestDetailsByRequestId.get(requestId)
        requestDetailsByRequestId.delete(requestId)

        if (blockedReason === 'other' &&
            errorText === 'net::ERR_BLOCKED_BY_CLIENT') {
            details.status = 'blocked'
        } else {
            details.status = 'failed'
            details.reason = errorText
        }
        requests.push(details)
    })

    return () => {
        requests.length = 0
        requestDetailsByRequestId.clear()
    }
}

module.exports = {
    logPageRequests
}
