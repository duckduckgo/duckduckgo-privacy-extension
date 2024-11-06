const defaultSettings = require('../../data/defaultSettings');
const browserWrapper = require('./wrapper');

const onSettingUpdate = new EventTarget();

// @ts-expect-error Workaround for the tests in unit-tests/node/reference-tests.
if (typeof CustomEvent === 'undefined') globalThis.CustomEvent = Event;

/**
 * Settings whose defaults can by managed by the system administrator
 */
const MANAGED_SETTINGS = ['hasSeenPostInstall'];
/**
 * Public api
 * Usage:
 * You can use promise callbacks to check readyness before getting and updating
 * settings.ready().then(() => settings.updateSetting('settingName', settingValue))
 */
let settings = {};
let isReady = false;
const _ready = init().then(() => {
    isReady = true;
    console.log('Settings are loaded');
});

async function init() {
    buildSettingsFromDefaults();
    await buildSettingsFromManagedStorage();
    await buildSettingsFromLocalStorage();
}

function ready() {
    return _ready;
}

// Ensures we have cleared up old storage keys we have renamed
function checkForLegacyKeys() {
    const legacyKeys = {
        // Keys to migrate
        whitelisted: 'allowlisted',
        whitelistOptIn: 'allowlistOptIn',

        // Keys to remove
        advanced_options: null,
        clickToLoadClicks: null,
        cookieExcludeList: null,
        dev: null,
        ducky: null,
        extensionIsEnabled: null,
        failedUpgrades: null,
        last_search: null,
        lastsearch_enabled: null,
        meanings: null,
        safesearch: null,
        socialBlockingIsEnabled: null,
        totalUpgrades: null,
        trackerBlockingEnabled: null,
        use_post: null,
        version: null,
        zeroclick_google_right: null,

        'surrogates-etag': null,
        'brokenSiteList-etag': null,
        'surrogateList-etag': null,
        'trackersWhitelist-etag': null,
        'trackersWhitelistTemporary-etag': null,
    };
    let syncNeeded = false;
    for (const legacyKey in legacyKeys) {
        const key = legacyKeys[legacyKey];
        if (!(legacyKey in settings)) {
            continue;
        }
        syncNeeded = true;
        const legacyValue = settings[legacyKey];
        if (key && legacyValue) {
            settings[key] = legacyValue;
        }
        delete settings[legacyKey];
    }
    if (syncNeeded) {
        syncSettingTolocalStorage();
    }
}

async function buildSettingsFromLocalStorage() {
    const results = await browserWrapper.getFromStorage(['settings']);
    // copy over saved settings from storage
    if (!results) return;
    settings = browserWrapper.mergeSavedSettings(settings, results);
    checkForLegacyKeys();
}

async function buildSettingsFromManagedStorage() {
    const results = await browserWrapper.getFromManagedStorage(MANAGED_SETTINGS);
    settings = browserWrapper.mergeSavedSettings(settings, results);
}

function buildSettingsFromDefaults() {
    // initial settings are a copy of default settings
    settings = Object.assign({}, defaultSettings);
}

function syncSettingTolocalStorage() {
    return browserWrapper.syncToStorage({ settings });
}

function getSetting(name) {
    if (!isReady) {
        console.warn(`Settings: getSetting() Settings not loaded: ${name}`);
        return;
    }

    // let all and null return all settings
    if (name === 'all') name = null;

    if (name) {
        return settings[name];
    } else {
        return settings;
    }
}

function updateSetting(name, value) {
    if (!isReady) {
        console.warn(`Settings: updateSetting() Setting not loaded: ${name}`);
        return;
    }

    settings[name] = value;
    syncSettingTolocalStorage().then(() => {
        onSettingUpdate.dispatchEvent(new CustomEvent(name, { detail: value }));
    });
}

function incrementNumericSetting(name, increment = 1) {
    if (!isReady) {
        console.warn('Settings: incrementNumericSetting() Setting not loaded:', name);
        return;
    }

    let value = settings[name];
    if (typeof value !== 'number' || isNaN(value)) {
        value = 0;
    }

    updateSetting(name, value + increment);
}

function removeSetting(name) {
    if (!isReady) {
        console.warn(`Settings: removeSetting() Setting not loaded: ${name}`);
        return;
    }
    if (settings[name]) {
        delete settings[name];
        syncSettingTolocalStorage();
    }
}

function logSettings() {
    browserWrapper.getFromStorage(['settings']).then((s) => {
        console.log(s.settings);
    });
}

module.exports = {
    getSetting,
    updateSetting,
    incrementNumericSetting,
    removeSetting,
    logSettings,
    ready,
    onSettingUpdate,
};
