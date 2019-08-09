const sha1 = require('../shared-utils/sha1')
const punycode = require('punycode')
const BASE_URL = ''
const HASH_PREFIX_SIZE = 4

class HTTPSService {
    constructor () {
        this._cache = new Map()
        this._activeRequests = new Map()
    }

    _cacheResponse (query, response) {
        // TODO add TTL
        this._cache.set(query, response)
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
        // TODO make sure we use punnycode + lowercase
        const hash = this._hostToHash(host)
        const query = hash.substr(0, HASH_PREFIX_SIZE)
        const result = this._cache.get(query)

        if (result) {
            return result.includes(hash)
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

        const queryUrl = new URL(BASE_URL)
        queryUrl.searchParams.append('pv1', query)

        const request = this._fetch(queryUrl.toString())
            .then(response => {
                this._activeRequests.delete(query)
                return response.json()
            })
            .then(data => {
                this._cacheResponse(query, data)
                const result = data.includes(hash)
                console.info(`HTTPS Service: ${host} is ${result ? '' : 'NOT'} upgradable.`)
                return result
            })
            .catch(e => {
                this._activeRequests.delete(query)
                console.error('HTTPS Service: Failed contacting service: ' + e.message)
                throw e
            })

        this._activeRequests.set(query, request)

        // TODO handle failures gracefully
        return request
    }

    clearCache () {
        this._cache.clear()
    }
}

module.exports = new HTTPSService()
