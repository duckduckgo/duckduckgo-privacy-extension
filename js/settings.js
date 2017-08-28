var load = require('load');

require.scopes.settings =(() => {
    var settings = {};

    // external settings defines a function that needs to run when a setting is updated
    var externalSettings = {
        'httpsEverywhereEnabled': function(value){ isExtensionEnabled = value }
    };

    function init() {
        buildSettingsFromDefaults();
        buildSettingsFromLocalStorage();
        registerListeners();
    }

    function buildSettingsFromLocalStorage() {
        chrome.storage.local.get(['settings'], function(results){
            Object.assign(settings, results['settings']);
            runExternalSettings();
        });
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
        return true;
    }

    function getSetting(name) {
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

    init();
    
    return {
        getSetting: getSetting,
        updateSetting: updateSetting,
        logSettings: logSettings
    }

})();
