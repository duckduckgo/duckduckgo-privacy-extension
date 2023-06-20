const defaultSettings = require('../../data/defaultSettings')

/**
 * Settings whose defaults can by managed by the system administrator
 */
const MANAGED_SETTINGS = ['hasSeenPostInstall']

export class Settings {
    /** @type {Settings | undefined} */
    shared;
    /**
     * Public api
     * Usage:
     * You can use promise callbacks to check readyness before getting and updating
     * settings.ready().then(() => settings.updateSetting('settingName', settingValue))
     */
    settings = {}
    isReady = false
    /** @type {Promise<any> | null} */
    _ready = null
    /**
     * @param {import("./wrapper").BrowserWrapper} browser
     */
    constructor (browser) {
        this.browser = browser
    }
    async init() {
        this._ready = this._init().then(() => {
            console.log('Settings are loaded')
        })
    }
    ready() {
        return this._ready;
    }
    async _init() {
        this.buildSettingsFromDefaults()
        await this.buildSettingsFromManagedStorage()
        await this.buildSettingsFromLocalStorage()
    }
    // Ensures we have cleared up old storage keys we have renamed
    checkForLegacyKeys () {
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
            'trackersWhitelistTemporary-etag': null
        }
        let syncNeeded = false
        for (const legacyKey in legacyKeys) {
            const key = legacyKeys[legacyKey]
            if (!(legacyKey in this.settings)) {
                continue
            }
            syncNeeded = true
            const legacyValue = this.settings[legacyKey]
            if (key && legacyValue) {
                this.settings[key] = legacyValue
            }
            delete this.settings[legacyKey]
        }
        if (syncNeeded) {
            this.syncSettingTolocalStorage()
        }
    }

    async buildSettingsFromLocalStorage () {
        const results = await this.browser.getFromStorage(['settings'])
        // copy over saved settings from storage
        if (!results) return
        this.settings = this.browser.mergeSavedSettings(this.settings, results)
        this.checkForLegacyKeys()
    }

    async buildSettingsFromManagedStorage (browser) {
        const results = await browser.getFromManagedStorage(MANAGED_SETTINGS)
        this.settings = browser.mergeSavedSettings(this.settings, results)
    }

    buildSettingsFromDefaults () {
        // initial settings are a copy of default settings
        this.settings = Object.assign({}, defaultSettings)
    }

    syncSettingTolocalStorage () {
        this.browser.syncToStorage({ settings: this.settings })
    }

    getSetting (name) {
        if (!this.isReady) {
            console.warn(`Settings: getSetting() Settings not loaded: ${name}`)
            return
        }

        // let all and null return all settings
        if (name === 'all') name = null

        if (name) {
            return this.settings[name]
        } else {
            return this.settings
        }
    }

    updateSetting (name, value) {
        if (!this.isReady) {
            console.warn(`Settings: updateSetting() Setting not loaded: ${name}`)
            return
        }

        this.settings[name] = value
        this.syncSettingTolocalStorage()
    }

    removeSetting (name) {
        if (!this.isReady) {
            console.warn(`Settings: removeSetting() Setting not loaded: ${name}`)
            return
        }
        if (this.settings[name]) {
            delete this.settings[name]
            this.syncSettingTolocalStorage()
        }
    }

    /**
     * @param {import("./wrapper").BrowserWrapper} browser
     */
    logSettings (browser) {
        browser.getFromStorage(['settings']).then((s) => {
            console.log(s.settings)
        })
    }
}
