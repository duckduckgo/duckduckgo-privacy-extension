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
 * Start logging requests for the given Page.
 * @param {import('@playwright/test').Page} page
 *   The Playwright page to log requests for.
 * @param {LoggedRequestDetails[]} requests
 *   Array of request details, appended to as requests happen.
 *   Note: The requests array is mutated by this function.
 * @param {function} [requestFilter]
 *   Optional filter function that (if given) should return falsey for requests
 *   that should be ignored.
 * @param {function} [transform]
 *   Optional function to transform each request before adding them to the
 *   requests array.
 * @param {function} [postTransformFilter]
 *   Optional second filter function that returns false for transformed requests
 *   that should be ignored.
 * @returns {Promise<function>}
 *   Function that clears logged requests (and in progress requests).
 */
export async function logPageRequests (
    page, requests, requestFilter, transform, postTransformFilter
) {
    /** @type {Map<number, LoggedRequestDetails>} */
    const requestDetailsByRequestId = new Map()

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

        if (!requestFilter || requestFilter(details)) {
            if (transform) {
                const transformedDetails = transform(details)
                if (!postTransformFilter || postTransformFilter(transformedDetails)) {
                    requests.push(transformedDetails)
                }
            } else {
                requests.push(details)
            }
        }
    }

    logRequestsPlaywright(page, requestDetailsByRequestId, saveRequestOutcome)

    return () => {
        requests.length = 0
        requestDetailsByRequestId.clear()
    }
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
