var load = require('load');

require.scopes.settings =(() => {
    var settings = {};

    // external settings defines a function that needs to run when a setting is updated
    var externalSettings = {
        'httpsEverywhereEnabled': function(value){ isExtensionEnabled = value }
    };

    function init() {
        buildSettingsFromDefaults();
        buildSettingsFromLocalStorage().then(() => {
            runExternalSettings();
            registerListeners();
        });
    }

    function buildSettingsFromLocalStorage(callback) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['settings'], function(results){
                savedSettings = results['settings'];
                Object.assign(settings, savedSettings);
                syncSettingTolocalStorage();
                resolve();
            });
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
        settings = load.JSONfromLocalFile('data/default_settings.json');
    }

    function syncSettingTolocalStorage(){
        chrome.storage.local.set({'settings': settings});
        return true;
    }

    function getSetting(name) {
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
    };

    
    var exports = {
        getSetting: getSetting,
        updateSetting: updateSetting,
    }

    init();
    
    return exports;

})();
