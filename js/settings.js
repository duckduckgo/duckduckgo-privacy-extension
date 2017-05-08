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
            savedSettings = results['settings'];
            Object.assign(settings, savedSettings);
            syncSettingTolocalStorage();
        });
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
            let setting = settings[name];
            if(setting){
                return setting
            }
            else{
                updateSetting(name, {});
                return {}
            }
        }
        else {
            return settings;
        }
    }

    function updateSetting(name, value) {
        settings[name] = value;
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

    init();
    
    var exports = {
        getSetting: getSetting,
        updateSetting: updateSetting
    }
    return exports;

})();
