var load = require('load');
/**
 * Public api
 * Usage:
 * You can use promise callbacks to check readyness before getting and updating
 * settings.ready().then(() => settings.updateSetting('settingName', settingValue))
 */
require.scopes.settings =(() => {
    var settings = {};
    let isReady = false
    let _ready = init().then(() => {
        isReady = true
        console.log("Settings are loaded")
    })

    // external settings defines a function that needs to run when a setting is updated
    var externalSettings = {
        'httpsEverywhereEnabled': function(value){ isExtensionEnabled = value }
    };

    function init() {
        return new Promise ((resolve, reject) => {
            buildSettingsFromDefaults();
            buildSettingsFromLocalStorage().then(() => {
                registerListeners()
                resolve()
            })
        })
    }

    function ready () {
        return _ready
    }

    function buildSettingsFromLocalStorage() {
        return new Promise ((resolve) => {
            chrome.storage.local.get(['settings'], function(results){
                Object.assign(settings, results['settings']);
                runExternalSettings();
                resolve()
            })
        })
    }

    function runExternalSettings(){
        for(var settingName in settings){
            let value = settings[settingName];
            runExternalSetting(settingName, value);
        }
    }

    function runExternalSetting(name, value){
        if(externalSettings[name] && typeof(externalSettings[name]) === 'function'){
            externalSettings[name](value);
        }
    }

    function buildSettingsFromDefaults() {
        settings = defaultSettings
    }

    function syncSettingTolocalStorage(){
        chrome.storage.local.set({'settings': settings});
    }

    function getSetting(name) {
        if (!isReady) {
            console.warn('Settings: getSetting() Settings not loaded')
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
            console.warn('Settings: updateSetting() Setting not loaded')
            return
        }

        settings[name] = value;
        runExternalSetting(name, value);
        syncSettingTolocalStorage();
    }

    function logSettings () {
        chrome.storage.local.get(['settings'], function (s) { 
            console.log(s.settings) 
        })
    }

    function registerListeners(){
        chrome.runtime.onMessage.addListener(onUpdateSetting);
        chrome.runtime.onMessage.addListener(onGetSetting);
    }

    var onUpdateSetting = function(req, sender, res) {
        if(req.updateSetting) {
            var name = req.updateSetting['name'];
            var value = req.updateSetting['value'];
            updateSetting(name, value);
        }
    };

    var onGetSetting = function(req, sender, res){
        if(req.getSetting){
            res(getSetting(req.getSetting.name));
        }
        return true;
    };
    

    return {
        getSetting: getSetting,
        updateSetting: updateSetting,
        logSettings: logSettings,
        ready: ready
    }

})();
