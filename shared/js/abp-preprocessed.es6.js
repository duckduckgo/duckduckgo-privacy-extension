/*
 * Load the abp-filter-parser node module and 
 * pre-process the easylists.
 *
 * This will be browserifyed and turned into abp.js by running 'grunt'
 */
abp = require('abp-filter-parser')
const deepFreeze = require('deep-freeze')

// these are defined in data/ and loaded in the manifest. 
// Make them immutable with deep-freeze
constants = deepFreeze(constants)
defaultSettings = deepFreeze(defaultSettings)

const ONEDAY = 1000*60*60*24

let lists = {
    easylists : {
        privacy: {
            constantsName: 'privacyEasylist',
            parsed: {},
            isLoaded: false
        },
        general: {
            constantsName: 'generalEasylist',
            parsed: {},
            isLoaded: false
        }
    },
    whitelists: {
        // source: https://github.com/duckduckgo/content-blocking-whitelist/blob/master/trackers-whitelist.txt
        trackersWhitelist: {
            constantsName: 'trackersWhitelist',
            parsed: {},
            isLoaded: false
        }
    }
}

// these are defined in trackers.js
easylists = lists.easylists
whitelists = lists.whitelists

/*
 * Get the list data and use abp to parse.
 * The parsed list data will be added to 
 * the easyLists object.
 */
function updateLists () {
    const atb = settings.getSetting('atb')
    const set_atb = settings.getSetting('set_atb')
    const versionParam = getVersionParam()

    for (let listType in lists) {
        for (let name in lists[listType]) {

            const constantsName = lists[listType][name].constantsName
            
            let url = constants[constantsName]
            if (!url) return 
                
            let etag = settings.getSetting(constantsName + '-etag') || ''

            // only add url params to contentblocking.js duckduckgo urls
            if(url.match(/^https?:\/\/(.+)?duckduckgo.com\/contentblocking\.js/)) {
                if (atb) url += '&atb=' + atb
                if (set_atb) url += '&set_atb=' + set_atb
                if (versionParam) url += versionParam
            }

            console.log('Checking for list update: ', name)

            // if we don't have parsed list data skip the etag to make sure we
            // get a fresh copy of the list to process
            if (Object.keys(lists[listType][name].parsed).length === 0) etag = ''
                
            load.loadExtensionFile({url: url, source: 'external', etag: etag}, (listData, response) => {
                const newEtag = response.getResponseHeader('etag') || ''
                console.log('Updating list: ', name)
                
                // sync new etag to storage
                settings.updateSetting(constantsName + '-etag', newEtag)
                
                abp.parse(listData, lists[listType][name].parsed)
                lists[listType][name].isLoaded = true
            })
        }
    }

    let trackersWhitelistTemporaryEtag = settings.getSetting('trackersWhitelistTemporary-etag') || ''
    // reset etag to get a new list copy if we don't have brokenSiteList data
    if (!trackersWhitelistTemporary || !trackersWhitelistTemporaryEtag) trackersWhitelistTemporaryEtag = ''

    // load broken site list
    // source: https://github.com/duckduckgo/content-blocking-whitelist/blob/master/trackers-whitelist-temporary.txt
    load.loadExtensionFile({url: constants.trackersWhitelistTemporary, etag: trackersWhitelistTemporaryEtag, source: 'external'}, (listData, response) => {
        const newTrackersWhitelistTemporaryEtag = response.getResponseHeader('etag') || ''
        settings.updateSetting('trackersWhitelistTemporary-etag', newTrackersWhitelistTemporaryEtag);

        // defined in site.js
        trackersWhitelistTemporary = listData.trim().split('\n')
    })
}

// Make sure the list updater runs on start up
settings.ready().then(() => updateLists())

if (window.chrome) {
    chrome.alarms.onAlarm.addListener(alarm => {
        if (alarm.name === 'updateLists') {
            settings.ready().then(() => updateLists())
        }
    })

    // set an alarm to recheck the lists
    // update every 30 minutes
    chrome.alarms.create('updateLists', { periodInMinutes: 30 })
} else {
    setInterval(updateLists, 30*60*1000)
}

// add version param to url on the first install and
// only once a day after than
function getVersionParam () {
    const manifest = window.chrome && chrome.runtime.getManifest()
    let version = manifest ? manifest.version || '' : 'safari'
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
