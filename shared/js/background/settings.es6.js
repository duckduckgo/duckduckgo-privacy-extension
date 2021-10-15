import * as utils from './utils'
const defaultSettings = require('../../data/defaultSettings')

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

async function init () {
    buildSettingsFromDefaults()
    await buildSettingsFromManagedStorage()
    await buildSettingsFromLocalStorage()
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

async function buildSettingsFromLocalStorage () {
    const results = utils.getFromStorage(['settings'])
    // copy over saved settings from storage
    if (!results) return
    settings = utils.mergeSavedSettings(settings, results)
    checkForLegacyKeys()
}

async function buildSettingsFromManagedStorage () {
    const results = await utils.getFromManagedStorage(MANAGED_SETTINGS)
    settings = utils.mergeSavedSettings(settings, results)
}

function buildSettingsFromDefaults () {
    // initial settings are a copy of default settings
    settings = Object.assign({}, defaultSettings)
}

function syncSettingTolocalStorage () {
    utils.syncToStorage({ settings: settings })
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
    utils.getFromStorage(['settings']).then((s) => {
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
