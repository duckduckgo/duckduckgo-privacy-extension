const sha1 = require('../shared-utils/sha1')
// eslint-disable-next-line node/no-deprecated-api
const punycode = require('punycode')
const constants = require('../../data/constants')
const HASH_PREFIX_SIZE = 4
const ONE_HOUR_MS = 60 * 60 * 1000

class HTTPSService {
    constructor () {
        this._cache = new Map()
        this._activeRequests = new Map()
    }

    _cacheResponse (query, data, expires) {
        let expiryDate = (new Date(expires)).getTime()

        if (isNaN(expiryDate)) {
            console.warn(`Expiry date is invalid: "${expires}", caching for 1h`)
            expiryDate = Date.now() + ONE_HOUR_MS
        }

        this._cache.set(query, {
            expires: expiryDate,
            data: data
        })
    }

    _hostToHash (host) {
        return sha1(punycode.toASCII(host.toLowerCase()))
    }

    // added here for easy mocking in tests
    _fetch (url) {
        return fetch(url)
    }

    /**
     * @param {string} host
     * @returns {Boolean|null}
     */
    checkInCache (host) {
        const hash = this._hostToHash(host)
        const query = hash.substr(0, HASH_PREFIX_SIZE)
        const result = this._cache.get(query)

        if (result) {
            return result.data.includes(hash)
        }

        return null
    }

    /**
     * @param {string} host
     * @returns {Promise<Boolean>}
     */
    checkInService (host) {
        const hash = this._hostToHash(host)
        const query = hash.substring(0, HASH_PREFIX_SIZE)

        if (this._activeRequests.has(query)) {
            console.info(`HTTPS Service: Request for ${host} is already in progress.`)
            return this._activeRequests.get(query)
        }

        console.info(`HTTPS Service: Requesting information for ${host} (${hash}).`)

        const queryUrl = new URL(constants.httpsService)
        queryUrl.searchParams.append('pv1', query)

        const request = this._fetch(queryUrl.toString())
            .then(response => {
                this._activeRequests.delete(query)

                return response.json()
                    .then(data => {
                        const expires = response.headers.get('expires')
                        this._cacheResponse(query, data, expires)
                        return data
                    })
            })
            .then(data => {
                const result = data.includes(hash)
                console.info(`HTTPS Service: ${host} is${result ? '' : ' not'} upgradable.`)
                return result
            })
            .catch(e => {
                this._activeRequests.delete(query)
                console.error('HTTPS Service: Failed contacting service: ' + e.message)
                throw e
            })

        this._activeRequests.set(query, request)

        return request
    }

    clearCache () {
        this._cache.clear()
    }

    clearExpiredCache () {
        const now = Date.now()

        Array.from(this._cache.keys())
            .filter(key => this._cache.get(key).expires < now)
            .forEach(key => this._cache.delete(key))
    }
}

module.exports = new HTTPSService()
