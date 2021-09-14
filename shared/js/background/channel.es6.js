const browserWrapper = require('./wrapper.es6')

const RELEASE_EXTENSION_IDS = [
    'caoacbimdbbljakfhgikoodekdnlcgpk', // edge store
    'bkdgflcldnnnapblkhphbgpggdiikppg', // chrome store
    'jid1-ZAdIEUB7XOzOJw@jetpack' // firefox
]
const IS_BETA = RELEASE_EXTENSION_IDS.indexOf(browserWrapper.getExtensionId()) === -1

module.exports = {
    IS_BETA
}
