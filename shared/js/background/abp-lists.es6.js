/*
 * Load the abp-filter-parser node module and
 * pre-process the easylists.
 */
const abp = require('abp-filter-parser')
const constants = require('../../data/constants')
const surrogates = require('./surrogates.es6')
const settings = require('./settings.es6')
const load = require('./load.es6')
const browserWrapper = require('./$BROWSER-wrapper.es6')

const ONEDAY = 1000 * 60 * 60 * 24

let lists = {
    whitelists: {
        // source: https://github.com/duckduckgo/content-blocking-whitelist/blob/master/trackers-whitelist.txt
        trackersWhitelist: {
            constantsName: 'trackersWhitelist',
            parser: abp,
            parsed: {},
            isLoaded: false
        }
    },
    surrogates: {
        surrogateList: {
            constantsName: 'surrogateList',
            parser: surrogates,
            parsed: {},
            isLoaded: false
        }
    }
}

var trackersWhitelistTemporary

function getTemporaryWhitelist () {
    return trackersWhitelistTemporary
}

function getWhitelists () {
    return lists.whitelists
}

/*
 * Get the list data and use abp to parse.
 * The parsed list data will be added to
 * the easyLists object.
 */
function updateLists () {
    const atb = settings.getSetting('atb')
    const setAtb = settings.getSetting('set_atb')
    const versionParam = getVersionParam()

    for (let listType in lists) {
        for (let name in lists[listType]) {
            const list = lists[listType][name]
            const constantsName = list.constantsName

            let url = constants[constantsName]
            if (!url) return

            let etag = settings.getSetting(constantsName + '-etag') || ''

            // only add url params to contentblocking.js duckduckgo urls
            if (url.match(/^https?:\/\/(.+)?duckduckgo.com\/contentblocking\.js/)) {
                if (atb) url += '&atb=' + atb
                if (setAtb) url += '&set_atb=' + setAtb
                if (versionParam) url += versionParam
            }

            console.log('Checking for list update: ', name)

            // if we don't have parsed list data skip the etag to make sure we
            // get a fresh copy of the list to process
            if (Object.keys(list.parsed).length === 0) etag = ''

            load.loadExtensionFile({url: url, source: 'external', etag: etag}).then((response) => {
                if (response && response.status === 200) {
                    const listData = response.data
                    const newEtag = response.getResponseHeader('etag') || ''
                    console.log('Updating list: ', name)

                    // sync new etag to storage
                    settings.updateSetting(constantsName + '-etag', newEtag)

                    list.parser.parse(listData, list.parsed)

                    list.isLoaded = true
                }
            })
        }
    }

    let trackersWhitelistTemporaryEtag = settings.getSetting('trackersWhitelistTemporary-etag') || ''
    // reset etag to get a new list copy if we don't have brokenSiteList data
    if (!trackersWhitelistTemporary || !trackersWhitelistTemporaryEtag) trackersWhitelistTemporaryEtag = ''

    // load broken site list
    // source: https://github.com/duckduckgo/content-blocking-whitelist/blob/master/trackers-whitelist-temporary.txt
    load.loadExtensionFile({url: constants.trackersWhitelistTemporary, etag: trackersWhitelistTemporaryEtag, source: 'external'}).then((response) => {
        if (response && response.status === 200) {
            const listData = response.data
            const newTrackersWhitelistTemporaryEtag = response.getResponseHeader('etag') || ''
            settings.updateSetting('trackersWhitelistTemporary-etag', newTrackersWhitelistTemporaryEtag)
            trackersWhitelistTemporary = listData.trim().split('\n')
        }
    })
}

// Make sure the list updater runs on start up
settings.ready().then(() => updateLists())

// add version param to url on the first install and
// only once a day after than
function getVersionParam () {
    let version = browserWrapper.getExtensionVersion()
    let lastEasylistUpdate = settings.getSetting('lastEasylistUpdate')
    let now = Date.now()
    let versionParam

    // check delta for last update or if lastEasylistUpdate does
    // not exist then this is the initial install
    if (lastEasylistUpdate) {
        let delta = now - new Date(lastEasylistUpdate)

        if (delta > ONEDAY) {
            versionParam = `&v=${version}`
        }
    } else {
        versionParam = `&v=${version}`
    }

    if (versionParam) settings.updateSetting('lastEasylistUpdate', now)

    return versionParam
}

module.exports = {
    getTemporaryWhitelist,
    getWhitelists,
    updateLists
}
