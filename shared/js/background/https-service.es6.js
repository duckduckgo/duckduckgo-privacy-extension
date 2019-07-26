const md5 = require('../shared-utils/md5')
const BASE_URL = ''
const HASH_PREFIX_SIZE = 4

class HTTPSService {
    constructor () {
        this._cache = new Map()
    }

    _cacheResponse (query, response) {
        // TODO add TTL
        this._cache.set(query, response)
    }

    /**
     * @param {string} host
     * @returns {Boolean|null} 
     */
    checkInCache (host) {
        const hash = md5(host)
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
        const hash = md5(host)
        const query = hash.substring(0, HASH_PREFIX_SIZE)

        const queryUrl = new URL(BASE_URL)
        queryUrl.searchParams.append('pv1', query)

        return fetch(queryUrl.toString())
            .then(response => response.json())
            .then(data => {
                this._cacheResponse(query, data)

                return data.includes(hash)
            })
            .catch(e => {
                console.error('Failed contacting service: ' + e.message)
                throw e
            })

        // check if same request is not already in progress
        // calculate hash - DONE
        // get substring - DONE
        // send request - DONE
        // return a promise - DONE
        // resolve request - DONE
    }
}

module.exports = new HTTPSService()
