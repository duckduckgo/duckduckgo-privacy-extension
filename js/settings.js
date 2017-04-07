var load = require('load');

require.scopes.settings =(() => {
    var settings = {};

    function init() {
        buildSettingsFromLocalStorage();
        buildSettingsFromDefaults();
        registerListeners();
    }

    function buildSettingsFromLocalStorage() {
        chrome.storage.local.get(null, function(results){
            for(var name in results){
                settings[name] = results[name];
            }
        });
    }

    function buildSettingsFromDefaults() {
        var defaults = load.JSONfromLocalFile('settings/defaults.json');
        for(var defaultName in defaults){
            // user stored settings are built first. Don't override them with a default
            if(!settings[defaultName]){
                settings[defaultName] = defaults[defaultName];
            }
        }
    }

    function syncSettingTolocalStorage(name, value){
        var settingToUpdate = {};
            settingToUpdate[name] =value;
            chrome.storage.local.set(settingToUpdate);
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
