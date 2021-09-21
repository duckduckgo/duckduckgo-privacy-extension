
const RELEASE_EXTENSION_IDS = [
    'caoacbimdbbljakfhgikoodekdnlcgpk', // edge store
    'bkdgflcldnnnapblkhphbgpggdiikppg', // chrome store
    'jid1-ZAdIEUB7XOzOJw@jetpack' // firefox
]
export const IS_BETA = RELEASE_EXTENSION_IDS.indexOf(chrome.runtime.id) === -1
