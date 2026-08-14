import browser from 'webextension-polyfill';
import { registerMessageHandler } from '../message-registry';
import { refreshUserBlockedSitesRules } from '../dnr-user-blocklist';
import {
    addDomainToGroup,
    ALARM_CHECKPOINT,
    ALARM_DAILY_RESET,
    ALARM_EXPIRY,
    applyElapsed,
    findGroupForHostname,
    formatAllowance,
    getCurrentlyBlockedDomains,
    getNextResetTime,
    getRemainingSeconds,
    hostnameFromUrl,
    removeDomainFromGroup,
} from '../../shared-utils/site-groups';
import { normalizeBlockedSite } from '../../shared-utils/blocked-sites';
import {
    createSiteGroup,
    deleteSiteGroup,
    ensureSiteGroups,
    getGroupUsage,
    getSiteGroups,
    saveGroupUsage,
    saveSiteGroups,
    updateSiteGroup,
} from '../site-groups-store';
import { getExtensionURL } from '../wrapper';

const BLOCKED_PAGE_PATH = '/html/blocked.html';

function decorateGroup(group, usage, now) {
    const remainingSeconds = getRemainingSeconds(group, usage, now);
    return {
        ...group,
        remainingSeconds,
        alwaysBlocked: group.maxSecondsPerDay <= 0,
        isBlocked: remainingSeconds <= 0,
    };
}

export default class SiteGroups {
    /**
     * @param {{ settings: import('../settings.js') }} options
     */
    constructor({ settings }) {
        this.featureName = 'SiteGroups';
        this.settings = settings;
        this.activeGroupId = null;
        this.lastTickAt = null;
        this._tickChain = Promise.resolve();
        this._redirectingTabs = new Set();

        // Register handlers before attaching listeners so a guard failure
        // cannot leave the options page and popup without a Groups backend.
        registerMessageHandler('getSiteGroupsState', () => this.getState());
        registerMessageHandler('createSiteGroup', () => this.handleCreate());
        registerMessageHandler('updateSiteGroup', (options) => this.handleUpdate(options));
        registerMessageHandler('deleteSiteGroup', (options) => this.handleDelete(options));
        registerMessageHandler('addSiteToGroup', (options) => this.handleAddDomain(options));
        registerMessageHandler('removeSiteFromGroup', (options) => this.handleRemoveDomain(options));
        registerMessageHandler('getPopupGroupStatus', (options) => this.getPopupStatus(options));

        try {
            this.attachNavigationGuards();
        } catch (error) {
            console.error('Failed to attach site group navigation guards', error);
        }

        this._ready = this.init();
    }

    async init() {
        try {
            await this.settings.ready();
            await ensureSiteGroups();
            await this.syncBlockedRules();
            await this.scheduleDailyReset();

            chrome.tabs.onActivated.addListener(() => this.queueSync());
            chrome.windows.onFocusChanged.addListener(() => this.queueSync());
            chrome.alarms.onAlarm.addListener((alarm) => this.onAlarm(alarm));
            browser.runtime.onStartup.addListener(() => {
                this.scheduleDailyReset();
                this.queueSync();
                this.redirectOpenBlockedTabs();
            });

            this.queueSync();
            this.redirectOpenBlockedTabs();
        } catch (error) {
            console.error('Site groups failed to initialize', error);
        }
    }

    blockedPageUrl() {
        return getExtensionURL(BLOCKED_PAGE_PATH);
    }

    /**
     * @param {string} [url]
     * @returns {boolean}
     */
    isBlockedPage(url) {
        if (!url) {
            return false;
        }
        const blockedPageUrl = this.blockedPageUrl();
        return url === blockedPageUrl || url.startsWith(`${blockedPageUrl}?`) || url.startsWith(`${blockedPageUrl}#`);
    }

    /**
     * DNR redirects to extension pages can fail and leave the tab spinning.
     * Force those navigations onto the blocked page from webNavigation/tabs.
     */
    attachNavigationGuards() {
        const onNavigate = (details) => {
            if (details.frameId !== 0) {
                return;
            }
            this.enforceBlockedNavigation(details.tabId, details.url);
        };

        chrome.webNavigation.onBeforeNavigate.addListener(onNavigate);
        chrome.webNavigation.onCommitted.addListener(onNavigate);
        chrome.webNavigation.onErrorOccurred.addListener(onNavigate);
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            const url = changeInfo.url || tab?.pendingUrl || tab?.url;
            if (url && (changeInfo.url || changeInfo.status === 'loading' || tab?.pendingUrl)) {
                this.enforceBlockedNavigation(tabId, url);
            }
            if (changeInfo.url || changeInfo.status === 'complete') {
                this.queueSync();
            }
        });
    }

    /**
     * @param {number} tabId
     * @param {string} [url]
     */
    async enforceBlockedNavigation(tabId, url) {
        if (!Number.isInteger(tabId) || tabId < 0 || !url || this.isBlockedPage(url)) {
            return;
        }

        // Do not await this._ready here: init() itself calls redirectOpenBlockedTabs(),
        // which would deadlock and prevent groups/popup status from ever loading.
        await this.settings.ready();
        await ensureSiteGroups();
        const hostname = hostnameFromUrl(url);
        if (!hostname) {
            return;
        }

        const group = findGroupForHostname(getSiteGroups(), hostname);
        if (!group || getRemainingSeconds(group, getGroupUsage()) > 0) {
            return;
        }

        await this.redirectTab(tabId);
    }

    async redirectOpenBlockedTabs() {
        const tabs = await chrome.tabs.query({});
        await Promise.all(
            tabs.map((tab) => (tab.id != null ? this.enforceBlockedNavigation(tab.id, tab.pendingUrl || tab.url) : Promise.resolve())),
        );
    }

    queueSync() {
        this._tickChain = this._tickChain
            .then(() => this.syncFromFocusedTab())
            .catch((error) => {
                console.error('Site groups timer failed', error);
            });
        return this._tickChain;
    }

    async onAlarm(alarm) {
        if (!alarm?.name) {
            return;
        }
        if (alarm.name === ALARM_DAILY_RESET) {
            await this.resetForNewDay();
            return;
        }
        if (alarm.name === ALARM_EXPIRY || alarm.name === ALARM_CHECKPOINT) {
            await this.queueSync();
        }
    }

    async resetForNewDay() {
        await this.persistElapsed(Date.now());
        this.activeGroupId = null;
        this.lastTickAt = null;
        saveGroupUsage({});
        await this.syncBlockedRules();
        await this.scheduleDailyReset();
        await this.queueSync();
    }

    async scheduleDailyReset() {
        const when = getNextResetTime();
        await chrome.alarms.clear(ALARM_DAILY_RESET);
        await chrome.alarms.create(ALARM_DAILY_RESET, { when });
    }

    async persistElapsed(now = Date.now()) {
        if (!this.activeGroupId || !this.lastTickAt) {
            return { expired: false, group: null };
        }

        const groups = getSiteGroups();
        const group = groups.find((item) => item.id === this.activeGroupId);
        if (!group) {
            this.activeGroupId = null;
            this.lastTickAt = null;
            return { expired: false, group: null };
        }

        const elapsedSeconds = Math.max(0, (now - this.lastTickAt) / 1000);
        const applied = applyElapsed(group, getGroupUsage(), elapsedSeconds, now);
        saveGroupUsage(applied.usage);
        this.lastTickAt = now;
        return { expired: applied.expired, group, remainingSeconds: applied.remainingSeconds };
    }

    async syncFromFocusedTab() {
        const now = Date.now();
        const previous = await this.persistElapsed(now);
        if (previous.expired && previous.group) {
            await this.expireGroup(previous.group);
        }

        const tab = await this.getFocusedHttpTab();
        const groups = getSiteGroups();
        const hostname = hostnameFromUrl(tab?.url);
        const group = findGroupForHostname(groups, hostname);
        const remaining = group ? getRemainingSeconds(group, getGroupUsage(), now) : 0;

        if (!group || remaining <= 0) {
            this.activeGroupId = null;
            this.lastTickAt = null;
            await chrome.alarms.clear(ALARM_EXPIRY);
            await chrome.alarms.clear(ALARM_CHECKPOINT);
            if (group && remaining <= 0) {
                await this.syncBlockedRules();
                if (tab?.id != null) {
                    await this.redirectTab(tab.id);
                }
            }
            return;
        }

        await this.startCounting(group, now, remaining);
    }

    /**
     * @param {import('../../shared-utils/site-groups').SiteGroup} group
     * @param {number} now
     * @param {number} remaining
     */
    async startCounting(group, now, remaining) {
        this.activeGroupId = group.id;
        this.lastTickAt = now;
        await chrome.alarms.clear(ALARM_EXPIRY);
        await chrome.alarms.create(ALARM_EXPIRY, { when: now + remaining * 1000 });
        await chrome.alarms.clear(ALARM_CHECKPOINT);
        await chrome.alarms.create(ALARM_CHECKPOINT, { periodInMinutes: 1 });
    }

    async expireGroup(group) {
        await this.syncBlockedRules();
        await this.redirectGroupTabs(group);
        this.activeGroupId = null;
        this.lastTickAt = null;
        await chrome.alarms.clear(ALARM_EXPIRY);
        await chrome.alarms.clear(ALARM_CHECKPOINT);
    }

    async syncBlockedRules() {
        const domains = getCurrentlyBlockedDomains(getSiteGroups(), getGroupUsage(), Date.now());
        const normalized = await refreshUserBlockedSitesRules(domains);
        this.settings.updateSetting('blockedSites', Object.fromEntries(normalized.map((domain) => [domain, true])));
        return normalized;
    }

    async isPopupOpen() {
        if (typeof chrome.runtime.getContexts !== 'function') {
            return false;
        }
        try {
            const contexts = await /** @type {Promise<chrome.runtime.ExtensionContext[]>} */ (
                chrome.runtime.getContexts({
                    contextTypes: [chrome.runtime.ContextType.POPUP],
                })
            );
            return Array.isArray(contexts) && contexts.length > 0;
        } catch {
            return false;
        }
    }

    async getFocusedHttpTab() {
        let win;
        try {
            win = await chrome.windows.getLastFocused();
        } catch {
            return null;
        }
        if (!win) {
            return null;
        }
        // Opening the popup unfocuses the browser window. Keep counting the
        // underlying tab while the popup is open — that is when the user is
        // watching the countdown.
        if (win.focused === false && !(await this.isPopupOpen())) {
            return null;
        }
        const tabs = await chrome.tabs.query({ active: true, windowId: win.id });
        const tab = tabs[0];
        if (!tab?.url || !hostnameFromUrl(tab.url)) {
            return null;
        }
        return tab;
    }

    async redirectGroupTabs(group) {
        const tabs = await chrome.tabs.query({});
        await Promise.all(
            tabs.map(async (tab) => {
                const hostname = hostnameFromUrl(tab.url);
                if (tab.id != null && findGroupForHostname([group], hostname)) {
                    await this.redirectTab(tab.id);
                }
            }),
        );
    }

    async redirectTab(tabId) {
        if (this._redirectingTabs.has(tabId)) {
            return;
        }
        this._redirectingTabs.add(tabId);
        try {
            const tab = await chrome.tabs.get(tabId).catch(() => null);
            if (this.isBlockedPage(tab?.url) || this.isBlockedPage(tab?.pendingUrl)) {
                return;
            }
            await chrome.tabs.update(tabId, { url: this.blockedPageUrl() });
        } catch (error) {
            console.warn('Failed to redirect blocked tab', error);
        } finally {
            setTimeout(() => this._redirectingTabs.delete(tabId), 750);
        }
    }

    async getState() {
        await this._ready;
        this.queueSync();
        const now = Date.now();
        const usage = getGroupUsage();
        return {
            groups: getSiteGroups().map((group) => decorateGroup(group, usage, now)),
            resetHour: 6,
        };
    }

    async handleCreate() {
        await this._ready;
        const group = createSiteGroup();
        return this.getState().then((state) => ({ ...state, createdId: group?.id || null }));
    }

    /**
     * @param {{ id?: string, name?: string, maxSecondsPerDay?: number }} [options]
     */
    async handleUpdate(options = {}) {
        const { id, name, maxSecondsPerDay } = options;
        await this._ready;
        if (!id) {
            return { saved: false, ...(await this.getState()) };
        }
        const updated = updateSiteGroup(id, { name, maxSecondsPerDay });
        if (!updated) {
            return { saved: false, ...(await this.getState()) };
        }
        if (getRemainingSeconds(updated, getGroupUsage()) <= 0) {
            await this.expireGroup(updated);
        } else {
            await this.syncBlockedRules();
            await this.queueSync();
        }
        return { saved: true, ...(await this.getState()) };
    }

    /**
     * @param {{ id?: string }} [options]
     */
    async handleDelete(options = {}) {
        const { id } = options;
        await this._ready;
        if (this.activeGroupId === id) {
            this.activeGroupId = null;
            this.lastTickAt = null;
        }
        if (!id) {
            return { saved: false, ...(await this.getState()) };
        }
        const deleted = deleteSiteGroup(id);
        await this.syncBlockedRules();
        await this.queueSync();
        return { saved: deleted, ...(await this.getState()) };
    }

    /**
     * @param {{ groupId?: string, domain?: string }} [options]
     */
    async handleAddDomain(options = {}) {
        const { groupId, domain } = options;
        await this._ready;
        const normalized = normalizeBlockedSite(domain);
        if (!groupId || !normalized) {
            return { saved: false, invalid: true, ...(await this.getState()) };
        }
        const groups = addDomainToGroup(getSiteGroups(), groupId, normalized);
        const group = groups.find((item) => item.id === groupId);
        if (!group) {
            return { saved: false, ...(await this.getState()) };
        }
        saveSiteGroups(groups);
        if (getRemainingSeconds(group, getGroupUsage()) <= 0) {
            await this.expireGroup(group);
        } else {
            await this.syncBlockedRules();
            await this.queueSync();
        }
        return { saved: true, domain: normalized, ...(await this.getState()) };
    }

    /**
     * @param {{ groupId?: string, domain?: string }} [options]
     */
    async handleRemoveDomain(options = {}) {
        const { groupId, domain } = options;
        await this._ready;
        if (!groupId || !domain) {
            return { saved: false, ...(await this.getState()) };
        }
        saveSiteGroups(removeDomainFromGroup(getSiteGroups(), groupId, domain));
        await this.syncBlockedRules();
        await this.queueSync();
        return { saved: true, ...(await this.getState()) };
    }

    /**
     * @param {number} [tabId]
     * @returns {Promise<chrome.tabs.Tab | null>}
     */
    async resolvePopupTab(tabId) {
        if (typeof tabId === 'number') {
            try {
                const tab = await chrome.tabs.get(tabId);
                if (tab?.url && hostnameFromUrl(tab.url)) {
                    return tab;
                }
            } catch {
                // Fall through to the focused-window lookup.
            }
        }

        const focused = await this.getFocusedHttpTab();
        if (focused) {
            return focused;
        }

        const [fallback] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        return fallback?.url && hostnameFromUrl(fallback.url) ? fallback : null;
    }

    /**
     * @param {{ tabId?: number }} [options]
     */
    async getPopupStatus(options = {}) {
        const { tabId } = options;
        await this._ready;
        const now = Date.now();
        const tab = await this.resolvePopupTab(tabId);
        const hostname = hostnameFromUrl(tab?.url);
        const groups = getSiteGroups();
        const group = findGroupForHostname(groups, hostname);

        if (group && getRemainingSeconds(group, getGroupUsage(), now) > 0) {
            const previous = await this.persistElapsed(now);
            if (previous.expired && previous.group) {
                await this.expireGroup(previous.group);
            }
            const remaining = getRemainingSeconds(group, getGroupUsage(), Date.now());
            if (remaining > 0) {
                await this.startCounting(group, Date.now(), remaining);
            }
        } else {
            this.queueSync();
        }

        const usage = getGroupUsage();
        const remainingSeconds = group ? getRemainingSeconds(group, usage, Date.now()) : 0;
        if (!hostname) {
            return {
                hostname: null,
                ungrouped: true,
                isCounting: false,
                remainingSeconds: 0,
                serverNow: Date.now(),
            };
        }
        if (!group) {
            return {
                hostname,
                ungrouped: true,
                isCounting: false,
                remainingSeconds: 0,
                serverNow: Date.now(),
            };
        }

        return {
            hostname,
            ungrouped: false,
            groupId: group.id,
            groupName: group.name,
            allowanceLabel: formatAllowance(group.maxSecondsPerDay),
            remainingSeconds,
            isBlocked: remainingSeconds <= 0,
            isCounting: remainingSeconds > 0,
            serverNow: Date.now(),
        };
    }
}
