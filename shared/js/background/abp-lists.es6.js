/*
 * Load the abp-filter-parser node module and 
 * pre-process the easylists.
 *
 * This will be browserifyed and turned into abp.js by running 'grunt'
 */
const abp = require('abp-filter-parser')
const deepFreeze = require('deep-freeze')
const constants = require('../../data/constants')
const defaultSettings = require('../../data/defaultSettings')
const surrogates = require('./surrogates.es6')
const settings = require('./settings.es6')
const ATB = require('./atb.es6')
const load = require('./load.es6')

const ONEDAY = 1000*60*60*24

let lists = {
    easylists : {
        privacy: {
            constantsName: 'privacyEasylist',
            parser: abp,
            parsed: {},
            isLoaded: false
        },
        general: {
            constantsName: 'generalEasylist',
            parser: abp,
            parsed: {},
            isLoaded: false
        }
    },
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

function getTemporaryWhitelist() {
    return trackersWhitelistTemporary;
}

function getEasylists () {
    return lists.easylists
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
    const set_atb = settings.getSetting('set_atb')
    const versionParam = getVersionParam()

    for (let listType in lists) {
        for (let name in lists[listType]) {

            const list = lists[listType][name]
            const constantsName = list.constantsName
            
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
            if (Object.keys(list.parsed).length === 0) etag = ''
                
            load.loadExtensionFile({url: url, source: 'external', etag: etag}, (listData, response) => {
                const newEtag = response.getResponseHeader('etag') || ''
                console.log('Updating list: ', name)
                
                // sync new etag to storage
                settings.updateSetting(constantsName + '-etag', newEtag)
                
                list.parser.parse(listData, list.parsed)

                list.isLoaded = true
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

        trackersWhitelistTemporary = listData.trim().split('\n')
    })
}

// Make sure the list updater runs on start up
settings.ready().then(() => updateLists())

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'updateLists') {
        settings.ready().then(() => updateLists())
    }
})

// set an alarm to recheck the lists
// update every 30 min
chrome.alarms.create('updateLists', {periodInMinutes: 30})

// add version param to url on the first install and
// only once a day after than
function getVersionParam () {
    const manifest = chrome.runtime.getManifest()
    let version = manifest.version || ''
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

chrome.runtime.onInstalled.addListener(function(details) {
    // only run the following section on install and on update
    if (details.reason.match(/install|update/)) {
        ATB.onInstalled();
    }

    // only show post install page on install if:
    // - the user wasn't already looking at the app install page
    // - the user hasn't seen the page before
    if (details.reason.match(/install/)) {
        settings.ready().then( () => {
            chrome.tabs.query({currentWindow: true, active: true}, function(tabs) { 
                const domain = (tabs && tabs[0]) ? tabs[0].url : ''
                const regExpPostInstall = new RegExp('duckduckgo\.com\/app')
                if ((!settings.getSetting('hasSeenPostInstall')) && (!domain.match(regExpPostInstall))) {
                    settings.updateSetting('hasSeenPostInstall', true)
                    chrome.tabs.create({
                        url: 'https://duckduckgo.com/app?post=1'
                    })
                }
            })
        })
    }

    // blow away old indexeddbs that might be there
    if (details.reason.match(/update/) && window.indexedDB) {
        const ms = 1000 * 60
        setTimeout(() => window.indexedDB.deleteDatabase('ddgExtension'), ms)
    }

    // remove legacy/unused `HTTPSwhitelisted` setting
    settings.ready().then(settings.removeSetting('HTTPSwhitelisted'))
})

module.exports = {
    getTemporaryWhitelist,
    getWhitelists,
    getEasylists,
    updateLists
}
