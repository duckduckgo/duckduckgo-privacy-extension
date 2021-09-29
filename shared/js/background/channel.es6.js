import browser from 'webextension-polyfill'

const RELEASE_EXTENSION_IDS = [
    'caoacbimdbbljakfhgikoodekdnlcgpk', // edge store
    'bkdgflcldnnnapblkhphbgpggdiikppg', // chrome store
    'jid1-ZAdIEUB7XOzOJw@jetpack' // firefox
]
const IS_BETA = RELEASE_EXTENSION_IDS.indexOf(browser.runtime.id) === -1

module.exports = {
    IS_BETA
}
