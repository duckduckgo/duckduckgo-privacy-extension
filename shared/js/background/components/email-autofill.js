import browser from 'webextension-polyfill';
import { sendPixelRequest } from '../pixels';
import { registerMessageHandler } from '../message-registry';
import { getDomain } from 'tldts';
import tdsStorage from '../storage/tds';
import { isInstalledWithinDays, sendTabMessage } from '../utils';
import { getFromSessionStorage, setToSessionStorage, removeFromSessionStorage, createAlarm } from '../wrapper';

/**
 * Config type definition
 * @typedef {Object} FirePixelOptions
 * @property {import('@duckduckgo/autofill/src/deviceApiCalls/__generated__/validators-ts').SendJSPixelParams['pixelName']} pixelName
 */

const MENU_ITEM_ID = 'ddg-autofill-context-menu-item';
export const REFETCH_ALIAS_ALARM = 'refetchAlias';
const REFETCH_ALIAS_ATTEMPT = 'refetchAliasAttempt';

export default class EmailAutofill {
    /**
     * @param {{
     *  settings: import('../settings.js');
     * }} options
     */
    constructor({ settings }) {
        this.settings = settings;
        this.contextMenuAvailable = !!browser.contextMenus;
        if (this.contextMenuAvailable) {
            // Create the contextual menu hidden by default
            browser.contextMenus.create(
                {
                    id: MENU_ITEM_ID,
                    title: 'Generate Private Duck Address',
                    contexts: ['editable'],
                    documentUrlPatterns: ['https://*/*'],
                    visible: false,
                },
                () => {
                    // It's fine if this context menu already exists, suppress that error.
                    // Note: Since webextension-polyfill does not wrap the contextMenus.create
                    //       API, the old callback + runtime.lastError approach must be used.
                    const { lastError } = browser.runtime;
                    if (lastError && lastError.message && !lastError.message.startsWith('Cannot create item with duplicate id')) {
                        throw lastError;
                    }
                },
            );
            browser.contextMenus.onClicked.addListener((info, tab) => {
                const userData = this.settings.getSetting('userData');
                if (tab?.id && userData.nextAlias) {
                    browser.tabs.sendMessage(tab.id, {
                        type: 'contextualAutofill',
                        alias: userData.nextAlias,
                    });
                }
            });
        }
        // fetch alias timer
        browser.alarms.onAlarm.addListener((alarmEvent) => {
            if (alarmEvent.name === REFETCH_ALIAS_ALARM) {
                this.fetchAlias();
            }
        });
        // message handlers
        registerMessageHandler('getAddresses', this.getAddresses.bind(this));
        registerMessageHandler('sendJSPixel', this.sendJSPixel.bind(this));
        registerMessageHandler('getAlias', this.getAlias.bind(this));
        registerMessageHandler('refreshAlias', this.refreshAlias.bind(this));
        registerMessageHandler('getEmailProtectionCapabilities', getEmailProtectionCapabilities);
        registerMessageHandler('getIncontextSignupDismissedAt', this.getIncontextSignupDismissedAt.bind(this));
        registerMessageHandler('setIncontextSignupPermanentlyDismissedAt', this.setIncontextSignupPermanentlyDismissedAt.bind(this));
        registerMessageHandler('getUserData', this.getUserData.bind(this));
        registerMessageHandler('addUserData', this.addUserData.bind(this));
        registerMessageHandler('removeUserData', this.removeUserData.bind(this));
        registerMessageHandler('logout', this.logout.bind(this));

        this.ready = this.init();
    }

    async init() {
        await this.settings.ready();
        // fetch alias if needed
        const userData = this.settings.getSetting('userData');
        if (userData && userData.token) {
            if (!userData.nextAlias) await this.fetchAlias();
            this.showContextMenuAction();
        }
    }

    async fetchAlias() {
        await this.settings.ready();
        // if another fetch was previously scheduled, clear that and execute now
        browser.alarms.clear(REFETCH_ALIAS_ALARM);

        const userData = this.settings.getSetting('userData');

        if (!userData?.token) return;

        return fetch('https://quack.duckduckgo.com/api/email/addresses', {
            method: 'post',
            headers: { Authorization: `Bearer ${userData.token}` },
        })
            .then(async (response) => {
                if (response.ok) {
                    return response.json().then(async ({ address }) => {
                        if (!/^[a-z0-9-]+$/.test(address)) throw new Error('Invalid address');

                        this.settings.updateSetting('userData', Object.assign(userData, { nextAlias: `${address}` }));
                        // Reset attempts
                        await removeFromSessionStorage(REFETCH_ALIAS_ATTEMPT);
                        return { success: true };
                    });
                } else {
                    throw new Error('An error occurred while fetching the alias');
                }
            })
            .catch(async (e) => {
                // TODO: Do we want to logout if the error is a 401 unauthorized?
                console.log('Error fetching new alias', e);
                // Don't try fetching more than 5 times in a row
                const attempts = (await getFromSessionStorage(REFETCH_ALIAS_ATTEMPT)) || 1;
                if (attempts < 5) {
                    createAlarm(REFETCH_ALIAS_ALARM, { delayInMinutes: 2 });
                    await setToSessionStorage(REFETCH_ALIAS_ATTEMPT, attempts + 1);
                }
                // Return the error so we can handle it
                return { error: e };
            });
    }

    async getAlias() {
        await this.settings.ready();
        const userData = this.settings.getSetting('userData');
        return { alias: userData?.nextAlias };
    }

    /**
     * @returns {Promise<import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').RefreshAliasResponse>}
     */
    async refreshAlias() {
        await this.fetchAlias();
        return this.getAddresses();
    }

    getAddresses() {
        const userData = this.settings.getSetting('userData');
        return {
            personalAddress: userData?.userName,
            privateAddress: userData?.nextAlias,
        };
    }

    showContextMenuAction() {
        if (this.contextMenuAvailable) {
            browser.contextMenus.update(MENU_ITEM_ID, { visible: true });
        }
    }

    hideContextMenuAction() {
        if (this.contextMenuAvailable) {
            browser.contextMenus.update(MENU_ITEM_ID, { visible: false });
        }
    }

    /**
     *
     * @param {FirePixelOptions}  options
     */
    sendJSPixel(options) {
        const { pixelName } = options;
        switch (pixelName) {
            case 'autofill_show':
                this.fireAutofillPixel('email_tooltip_show');
                break;
            case 'autofill_private_address':
                this.fireAutofillPixel('email_filled_random', true);
                break;
            case 'autofill_personal_address':
                this.fireAutofillPixel('email_filled_main', true);
                break;
            case 'incontext_show':
                sendPixelRequest('incontext_show');
                break;
            case 'incontext_primary_cta':
                sendPixelRequest('incontext_primary_cta');
                break;
            case 'incontext_dismiss_persisted':
                sendPixelRequest('incontext_dismiss_persisted');
                break;
            case 'incontext_close_x':
                sendPixelRequest('incontext_close_x');
                break;
            default:
                getFromSessionStorage('dev').then((isDev) => {
                    if (isDev) console.error('Unknown pixel name', pixelName);
                });
        }
    }

    fireAutofillPixel(pixel, shouldUpdateLastUsed = false) {
        const userData = this.settings.getSetting('userData');
        if (!userData?.userName) return;

        const lastAddressUsedAt = this.settings.getSetting('lastAddressUsedAt') ?? '';

        sendPixelRequest(pixel, { duck_address_last_used: lastAddressUsedAt, cohort: userData.cohort });
        if (shouldUpdateLastUsed) {
            this.settings.updateSetting('lastAddressUsedAt', currentDate());
        }
    }

    getIncontextSignupDismissedAt() {
        const permanentlyDismissedAt = this.settings.getSetting('incontextSignupPermanentlyDismissedAt');
        // TODO: inject this dependency (after TDS refactor lands)
        const installedDays = tdsStorage.config.features.incontextSignup?.settings?.installedDays ?? 3;
        const isInstalledRecently = isInstalledWithinDays(installedDays);
        return { success: { permanentlyDismissedAt, isInstalledRecently } };
    }

    setIncontextSignupPermanentlyDismissedAt({ value }) {
        this.settings.updateSetting('incontextSignupPermanentlyDismissedAt', value);
    }

    // Get user data to be used by the email web app settings page. This includes
    // username, last alias, and a token for generating additional aliases.
    async getUserData(_, sender) {
        if (!isExpectedSender(sender)) return;

        await this.settings.ready();
        const userData = this.settings.getSetting('userData');
        if (userData) {
            return userData;
        } else {
            return { error: 'Something seems wrong with the user data' };
        }
    }

    async addUserData(userData, sender) {
        const { userName, token } = userData;
        if (!isExpectedSender(sender)) return;

        const sendDdgUserReady = async () => {
            const tabs = await browser.tabs.query({});
            tabs.forEach((tab) => sendTabMessage(tab.id, { type: 'ddgUserReady' }));
        };

        await this.settings.ready();
        const { existingToken } = this.settings.getSetting('userData') || {};

        // If the user is already registered, just notify tabs that we're ready
        if (existingToken === token) {
            sendDdgUserReady();
            return { success: true };
        }

        // Check general data validity
        if (isValidUsername(userName) && isValidToken(token)) {
            this.settings.updateSetting('userData', userData);
            // Once user is set, fetch the alias and notify all tabs
            const response = await this.fetchAlias();
            if (response && 'error' in response) {
                return { error: response.error.message };
            }

            sendDdgUserReady();
            this.showContextMenuAction();
            return { success: true };
        } else {
            return { error: 'Something seems wrong with the user data' };
        }
    }

    async removeUserData(_, sender) {
        if (!isExpectedSender(sender)) return;
        await this.logout();
    }

    async logout() {
        this.settings.updateSetting('userData', {});
        this.settings.updateSetting('lastAddressUsedAt', '');
        // Broadcast the logout to all tabs
        const tabs = await browser.tabs.query({});
        tabs.forEach((tab) => {
            sendTabMessage(tab.id, { type: 'logout' });
        });
        this.hideContextMenuAction();
    }
}

function currentDate() {
    return new Date().toLocaleString('en-CA', {
        timeZone: 'America/New_York',
        dateStyle: 'short',
    });
}

/**
 * Given a username, returns a valid email address with the duck domain
 * @param {string} address
 * @returns {string}
 */
export const formatAddress = (address) => address + '@duck.com';

/**
 * Checks formal username validity
 * @param {string} userName
 * @returns {boolean}
 */
export const isValidUsername = (userName) => /^[a-z0-9_]+$/.test(userName);

/**
 * Checks formal token validity
 * @param {string} token
 * @returns {boolean}
 */
export const isValidToken = (token) => /^[a-z0-9]+$/.test(token);

function isExpectedSender(sender) {
    try {
        const domain = getDomain(sender.url);
        const { pathname } = new URL(sender.url);
        return domain === 'duckduckgo.com' && pathname.startsWith('/email');
    } catch {
        return false;
    }
}

function getEmailProtectionCapabilities(_, sender) {
    if (!isExpectedSender(sender)) return;

    return {
        addUserData: true,
        getUserData: true,
        removeUserData: true,
    };
}
