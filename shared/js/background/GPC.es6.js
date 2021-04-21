/**
 *
 * Sets GPC signal header
 *
 */
const settings = require('./settings.es6')

// Return Sec-GPC header if setting enabled
function getHeader () {
    const GPCEnabled = settings.getSetting('GPC')
    if (GPCEnabled) {
        return {
            name: 'Sec-GPC',
            value: '1'
        }
    }
}

module.exports = {
    getHeader: getHeader
}
