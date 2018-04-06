const load = require('./load.es6')
const utils = require('./utils.es6')
const defaultSettings = require('../../data/defaultSettings')
/**
 * Public api
 * Usage:
 * You can use promise callbacks to check readyness before getting and updating
 * settings.ready().then(() => settings.updateSetting('settingName', settingValue))
 */
var settings = {};
let isReady = false
let _ready = init().then(() => {
    isReady = true
    console.log("Settings are loaded")
})

function init() {
    return new Promise ((resolve, reject) => {
        buildSettingsFromDefaults()
        buildSettingsFromLocalStorage().then(() => {
            resolve()
        })
    })
}

function ready () {
    return _ready
}

function buildSettingsFromLocalStorage() {
    return new Promise ((resolve) => {
        utils.getFromStorage(['settings'], function(results){
            // copy over saved settings from storage
            if (window.safari) {
                if (results) {
                    Object.assign(settings, results)
                }
            } else {
                Object.assign(settings, results['settings'])
            }
            resolve()
        })
    })
}

function buildSettingsFromDefaults() {
    // initial settings are a copy of default settings
    settings = Object.assign({}, defaultSettings)
}

function syncSettingTolocalStorage(){
    utils.syncToStorage({'settings': settings});
}

function getSetting(name) {
    if (!isReady) {
        console.warn(`Settings: getSetting() Settings not loaded: ${name}`)
        return
    }

    // let all and null return all settings
    if (name === 'all') name = null;

    if(name){
        return settings[name];
    }
    else {
        return settings;
    }
}

function updateSetting(name, value) {
    if (!isReady) {
        console.warn(`Settings: updateSetting() Setting not loaded: ${name}`)
        return
    }

    settings[name] = value;
    syncSettingTolocalStorage();
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
    utils.getFromStorage(['settings'], function (s) {
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
