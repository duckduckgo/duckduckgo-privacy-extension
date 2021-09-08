const defaultSettings = require('../../data/defaultSettings')
const etags = require('../../data/etags.json')
const browserWrapper = require('./wrapper.es6')

/**
 * Settings whose defaults can by managed by the system administrator
 */
const MANAGED_SETTINGS = ['hasSeenPostInstall']
/**
 * Public api
 * Usage:
 * You can use promise callbacks to check readyness before getting and updating
 * settings.ready().then(() => settings.updateSetting('settingName', settingValue))
 */
let settings = {}
let isReady = false
const _ready = init().then(() => {
    isReady = true
    console.log('Settings are loaded')
})

function init () {
    return new Promise((resolve) => {
        buildSettingsFromDefaults()
        buildSettingsFromManagedStorage()
            .then(buildSettingsFromLocalStorage)
            .then(() => resolve())
    })
}

function ready () {
    return _ready
}

// Ensures we have cleared up old storage keys we have renamed
function checkForLegacyKeys () {
    const legacyKeys = {
        // Keys to migrate
        whitelisted: 'allowlisted',
        whitelistOptIn: 'allowlistOptIn',

        // Keys to remove
        cookieExcludeList: null,
        'surrogates-etag': null,
        'brokenSiteList-etag': null,
        'surrogateList-etag': null,
        'trackersWhitelist-etag': null,
        'trackersWhitelistTemporary-etag': null
    }
    let syncNeeded = false
    for (const legacyKey in legacyKeys) {
        const key = legacyKeys[legacyKey]
        if (!(legacyKey in settings)) {
            continue
        }
        syncNeeded = true
        const legacyValue = settings[legacyKey]
        if (key && legacyValue) {
            settings[key] = legacyValue
        }
        delete settings[legacyKey]
    }
    if (syncNeeded) {
        syncSettingTolocalStorage()
    }
}

function buildSettingsFromLocalStorage () {
    return new Promise((resolve) => {
        browserWrapper.getFromStorage(['settings'], function (results) {
            // copy over saved settings from storage
            if (!results) resolve()
            settings = browserWrapper.mergeSavedSettings(settings, results)
            checkForLegacyKeys()
            resolve()
        })
    })
}

function buildSettingsFromManagedStorage () {
    return new Promise((resolve) => {
        browserWrapper.getFromManagedStorage(MANAGED_SETTINGS, (results) => {
            settings = browserWrapper.mergeSavedSettings(settings, results)
            resolve()
        })
    })
}

function buildSettingsFromDefaults () {
    // initial settings are a copy of default settings
    settings = Object.assign({}, defaultSettings, etags)
}

function syncSettingTolocalStorage () {
    browserWrapper.syncToStorage({ settings: settings })
}

function getSetting (name) {
    if (!isReady) {
        console.warn(`Settings: getSetting() Settings not loaded: ${name}`)
        return
    }

    // let all and null return all settings
    if (name === 'all') name = null

    if (name) {
        return settings[name]
    } else {
        return settings
    }
}

function updateSetting (name, value) {
    if (!isReady) {
        console.warn(`Settings: updateSetting() Setting not loaded: ${name}`)
        return
    }

    settings[name] = value
    syncSettingTolocalStorage()
}

function removeSetting (name) {
    if (!isReady) {
        console.warn(`Settings: removeSetting() Setting not loaded: ${name}`)
        return
    }
    if (settings[name]) {
        delete settings[name]
        syncSettingTolocalStorage()
    }
}

function logSettings () {
    browserWrapper.getFromStorage(['settings'], function (s) {
        console.log(s.settings)
    })
}

module.exports = {
    getSetting: getSetting,
    updateSetting: updateSetting,
    removeSetting: removeSetting,
    logSettings: logSettings,
    ready: ready
}
