var load = require('load');
/**
 * Public api
 * Usage:
 * You can use promise callbacks to check readyness before getting and updating
 * settings.ready().then(() => settings.updateSetting('settingName', settingValue))
 */
require.scopes.settings =(() => {
    var settings = {};
    // external settings defines a function that needs to run when a setting is updated
    var externalSettings = {
        'httpsEverywhereEnabled': function(value){ isExtensionEnabled = value }
    };

    let isReady = false
    let _ready = init().then(() => {
        isReady = true
        console.log("Settings are loaded")
    })


    function init() {
        return new Promise ((resolve, reject) => {
            buildSettingsFromDefaults()
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
            if (window.chrome) {
                chrome.storage.local.get(['settings'], function(results){
                    // copy over saved settings from storage
                    Object.assign(settings, results['settings']);

                    runExternalSettings();
                    resolve()
                })
            } else {
                // copy over saved settings from storage
                let storedSettings = localStorage['settings']
                if (storedSettings) {
                    Object.assign(settings, JSON.parse(storedSettings))
                }
                runExternalSettings();
                resolve()
            }
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
        // initial settings are a copy of default settings
        settings = Object.assign({}, defaultSettings)
    }

    function syncSettingTolocalStorage(){
        if (window.chrome) {
            chrome.storage.local.set({'settings': settings});
        } else {
            localStorage['settings'] = JSON.stringify(settings)
        }
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
        runExternalSetting(name, value);
        syncSettingTolocalStorage();
    }

    function logSettings () {
        if (window.chrome) {
            chrome.storage.local.get(['settings'], function (s) {
                console.log(s.settings)
            })
        } else {
            console.log(localStorage['settings']) 
        }
    }

    function registerListeners() {
        if (window.chrome) {
            chrome.runtime.onMessage.addListener(onUpdateSetting);
            chrome.runtime.onMessage.addListener(onGetSetting);
        } else {
            safari.application.addEventListener('message', onSettingsMessage, false)
        }
    }

    var onUpdateSetting = function(req, sender, res) {
        if(req.updateSetting) {
            var name = req.updateSetting['name'];
            var value = req.updateSetting['value'];
            updateSetting(name, value);
        }
    };

    var onGetSetting = function(req, sender, res) {
        if(req.getSetting){
            res(getSetting(req.getSetting.name));
        }
        return true;
    };

    // safari message passing to options page
    var onSettingsMessage = function(e) {
        if (e.message.getSetting) {
            let settingName = e.message.getSetting.name || ''
            let setting = getSetting(settingName) || {}
            
            // sender creates a timestamp in the message
            // add timestamp to the response so sender knows which requests
            // this goes with
            setting.timestamp = e.message.timestamp
            
            e.target.page.dispatchMessage('getSetting', setting)
        }
        else if (e.message.updateSetting) {
            let name = e.message.updateSetting.name
            let val = e.message.updateSetting.value
            if (name && val) {
                updateSetting(name, val)
            }
        }
    };

    return {
        getSetting: getSetting,
        updateSetting: updateSetting,
        logSettings: logSettings,
        ready: ready
    }

})();
