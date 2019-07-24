class HTTPSService {
    /**
     * @param {string} host
     * @returns {Boolean|null} 
     */
    checkInCache (host) {
        return null
    }

    /**
     * @param {string} host
     * @returns {Promise<Boolean>}
     */
    checkInService (host) {
        // check if same request is not already in progress
        // calculate hash
        // get substring
        // send request
        // return a promise
        // resolve request

        return new Promise((resolve, reject) => resolve(true))
    }
}

module.exports = new HTTPSService()
