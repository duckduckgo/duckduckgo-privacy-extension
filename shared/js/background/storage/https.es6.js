const Storage = require('./storage.es6')

class HTTPSStorage {
    constructor (ops) {
        ops.validateChecksum = this.validateChecksum
        this.storage = new Storage(ops)
    }

    getLists (lists) {
        return this.storage.getLists(lists)
    }

    validateChecksum (data, listDetails) {
        // we only have a checksum on the upgrade list
        if (!(listDetails.name === 'httpsUpgradeList')) {
            return true
        }

        // make sure we have all the correct data to validate
        if (!(data && data.data && data.checksum && data.checksum.sha256)) {
            return false
        }

        // need a buffer to send to crypto.subtle
        let buffer = Buffer.from(data.data, 'base64')

        return crypto.subtle.digest('SHA-256', buffer).then(arrayBuffer => {
            let sha256 = Buffer.from(arrayBuffer).toString('base64')
            if (data.checksum.sha256 && data.checksum.sha256 === sha256) {
                return true
            } else {
                return false
            }
        })
    }
}
module.exports = new HTTPSStorage({dbName: 'https', tableName: 'httpsStorage'})
