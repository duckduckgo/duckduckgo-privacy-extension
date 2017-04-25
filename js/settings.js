var load = require('load');

require.scopes.settings =(() => {
    var settings = {};

    function init() {
        buildSettingsFromDefaults();
        buildSettingsFromLocalStorage();
        registerListeners();
    }

    function buildSettingsFromLocalStorage(callback) {
        chrome.storage.local.get(['settings'], function(results){
            savedSettings = JSON.parse(results['settings']);
            Object.assign(settings, savedSettings);
        });
    }

    function buildSettingsFromDefaults() {
        settings = load.JSONfromLocalFile('data/default_settings.json');
    }

    function syncSettingTolocalStorage(name, value){
        var toSync = JSON.stringify(settings);
        chrome.storage.local.set({'settings': toSync});
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
        syncSettingTolocalStorage(name, value);
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

    init();
    
    var exports = {
        getSetting: getSetting,
        updateSetting: updateSetting
    }
    return exports;

})();
