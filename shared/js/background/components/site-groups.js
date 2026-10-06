import browser from 'webextension-polyfill';
import { registerMessageHandler } from '../message-registry';
import { refreshUserBlockedSitesRules } from '../dnr-user-blocklist';
import {
    refreshCategoryAllowRules,
    isAdultGamblingBlockEnabled,
    setAdultGamblingBlockEnabled,
    shouldRedirectCategoryNavigation,
} from '../dnr-category-blocklist';
import {
    addDomainToGroup,
    ALARM_CHECKPOINT,
    ALARM_DAILY_RESET,
    ALARM_EXPIRY,
    applyAllowedElapsed,
    applyElapsed,
    findGroupForHostname,
    formatAllowance,
    getCurrentlyBlockedDomains,
    getDomainUsage,
    getNextResetTime,
    getRemainingSeconds,
    getUsageDays,
    rollAllowedSiteUsage,
    rollUsageToPeriod,
    TIME_ANALYTICS_RANGE_DAYS,
    hostnameFromUrl,
    isAlwaysBlockGroup,
    isGroupSettingsLocked,
    removeDomainFromGroup,
} from '../../shared-utils/site-groups';
import { normalizeBlockedSite } from '../../shared-utils/blocked-sites';
import { findOverlappingAllowedPatterns, matchingAllowedPattern } from '../../shared-utils/allowed-sites';
import { getAllowedSiteUsage, getAllowedSites, removeAllowedSitePatterns, saveAllowedSiteUsage } from '../allowed-sites-store';
import { isSanctuaryActive } from '../sanctuary-store';
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
import { getExtensionURL, getManifestVersion } from '../wrapper';
import { refreshOpenTabActionIcons } from '../events/privacy-icon-indicator';

const BLOCKED_PAGE_PATH = '/html/blocked.html';

function decorateGroup(group, usage, now) {
    const remainingSeconds = getRemainingSeconds(group, usage, now);
    return {
        ...group,
        remainingSeconds,
        domainUsage: getDomainUsage(group, usage, now),
        usageDays: getUsageDays(group, usage, now, TIME_ANALYTICS_RANGE_DAYS),
        alwaysBlocked: group.maxSecondsPerDay <= 0,
        isAlwaysBlock: isAlwaysBlockGroup(group),
        isBlocked: remainingSeconds <= 0,
        settingsLocked: isGroupSettingsLocked(group, usage, now),
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
        this.activeAllowedPattern = null;
        this.activeHostname = null;
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
        registerMessageHandler('setAdultGamblingBlock', (options) => this.handleSetAdultGamblingBlock(options));

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

            browser.tabs.onActivated.addListener(() => this.queueSync());
            browser.windows.onFocusChanged.addListener(() => this.queueSync());
            browser.alarms.onAlarm.addListener((alarm) => this.onAlarm(alarm));
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

        browser.webNavigation.onBeforeNavigate.addListener(onNavigate);
        browser.webNavigation.onCommitted.addListener(onNavigate);
        browser.webNavigation.onErrorOccurred.addListener(onNavigate);
        browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
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
        if (group && getRemainingSeconds(group, getGroupUsage()) <= 0) {
            await this.redirectTab(tabId);
            return;
        }

        if (await shouldRedirectCategoryNavigation(url)) {
            await this.redirectTab(tabId);
        }
    }

    async redirectOpenBlockedTabs() {
        const tabs = await browser.tabs.query({});
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
        this.activeAllowedPattern = null;
        this.activeHostname = null;
        this.lastTickAt = null;
        saveGroupUsage(rollUsageToPeriod(getGroupUsage(), Date.now()));
        saveAllowedSiteUsage(rollAllowedSiteUsage(getAllowedSiteUsage(), Date.now()));
        await this.syncBlockedRules();
        await this.scheduleDailyReset();
        await this.queueSync();
    }

    async scheduleDailyReset() {
        const when = getNextResetTime();
        await browser.alarms.clear(ALARM_DAILY_RESET);
        await browser.alarms.create(ALARM_DAILY_RESET, { when });
    }

    async persistElapsed(now = Date.now()) {
        if (!this.lastTickAt || (!this.activeGroupId && !this.activeAllowedPattern)) {
            return { expired: false, group: null };
        }

        if (!this.activeGroupId) {
            const elapsedSeconds = Math.max(0, (now - this.lastTickAt) / 1000);
            saveAllowedSiteUsage(applyAllowedElapsed(getAllowedSiteUsage(), elapsedSeconds, now, this.activeAllowedPattern));
            this.lastTickAt = now;
            return { expired: false, group: null };
        }

        const groups = getSiteGroups();
        const group = groups.find((item) => item.id === this.activeGroupId);
        if (!group) {
            this.activeGroupId = null;
            this.activeAllowedPattern = null;
            this.activeHostname = null;
            this.lastTickAt = null;
            return { expired: false, group: null };
        }

        const elapsedSeconds = Math.max(0, (now - this.lastTickAt) / 1000);
        const applied = applyElapsed(group, getGroupUsage(), elapsedSeconds, now, this.activeHostname);
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
        const group = isSanctuaryActive() ? null : findGroupForHostname(groups, hostname);
        const remaining = group ? getRemainingSeconds(group, getGroupUsage(), now) : 0;

        if (group && remaining > 0) {
            await this.startCounting(group, now, remaining, hostname);
            return;
        }

        if (group && remaining <= 0) {
            this.activeGroupId = null;
            this.activeAllowedPattern = null;
            this.activeHostname = null;
            this.lastTickAt = null;
            await browser.alarms.clear(ALARM_EXPIRY);
            await browser.alarms.clear(ALARM_CHECKPOINT);
            await this.syncBlockedRules();
            if (tab?.id != null) {
                await this.redirectTab(tab.id);
            }
            return;
        }

        const allowedPattern = matchingAllowedPattern(hostname, getAllowedSites());
        if (allowedPattern) {
            await this.startAllowedCounting(allowedPattern, hostname, now);
            return;
        }

        this.activeGroupId = null;
        this.activeAllowedPattern = null;
        this.activeHostname = null;
        this.lastTickAt = null;
        await browser.alarms.clear(ALARM_EXPIRY);
        await browser.alarms.clear(ALARM_CHECKPOINT);
    }

    /**
     * @param {import('../../shared-utils/site-groups').SiteGroup} group
     * @param {number} now
     * @param {number} remaining
     * @param {string | null | undefined} hostname
     */
    async startCounting(group, now, remaining, hostname) {
        this.activeGroupId = group.id;
        this.activeAllowedPattern = null;
        this.activeHostname = hostname || null;
        this.lastTickAt = now;
        await browser.alarms.clear(ALARM_EXPIRY);
        await browser.alarms.create(ALARM_EXPIRY, { when: now + remaining * 1000 });
        await browser.alarms.clear(ALARM_CHECKPOINT);
        await browser.alarms.create(ALARM_CHECKPOINT, { periodInMinutes: 1 });
    }

    /**
     * @param {string} pattern
     * @param {string | null | undefined} hostname
     * @param {number} now
     */
    async startAllowedCounting(pattern, hostname, now) {
        this.activeGroupId = null;
        this.activeAllowedPattern = pattern;
        this.activeHostname = hostname || null;
        this.lastTickAt = now;
        await browser.alarms.clear(ALARM_EXPIRY);
        await browser.alarms.clear(ALARM_CHECKPOINT);
        await browser.alarms.create(ALARM_CHECKPOINT, { periodInMinutes: 1 });
    }

    async expireGroup(group) {
        await this.syncBlockedRules();
        await this.redirectGroupTabs(group);
        this.activeGroupId = null;
        this.activeAllowedPattern = null;
        this.activeHostname = null;
        this.lastTickAt = null;
        await browser.alarms.clear(ALARM_EXPIRY);
        await browser.alarms.clear(ALARM_CHECKPOINT);
    }

    async syncBlockedRules() {
        const domains = getCurrentlyBlockedDomains(getSiteGroups(), getGroupUsage(), Date.now());
        const normalized = await refreshUserBlockedSitesRules(domains);
        this.settings.updateSetting('blockedSites', Object.fromEntries(normalized.map((domain) => [domain, true])));
        return normalized;
    }

    async isPopupOpen() {
        const runtime = /** @type {typeof browser.runtime & { getContexts?: (query: { contextTypes: string[] }) => Promise<unknown[]> }} */ (
            browser.runtime
        );
        if (typeof runtime.getContexts !== 'function') {
            return false;
        }
        try {
            const contexts = await runtime.getContexts({ contextTypes: ['POPUP'] });
            return Array.isArray(contexts) && contexts.length > 0;
        } catch {
            return false;
        }
    }

    async getFocusedHttpTab() {
        let win;
        try {
            win = await browser.windows.getLastFocused();
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
        const tabs = await browser.tabs.query({ active: true, windowId: win.id });
        const tab = tabs[0];
        if (!tab?.url || !hostnameFromUrl(tab.url)) {
            return null;
        }
        return tab;
    }

    async redirectGroupTabs(group) {
        const tabs = await browser.tabs.query({});
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
            const tab = await browser.tabs.get(tabId).catch(() => null);
            if (this.isBlockedPage(tab?.url) || this.isBlockedPage(tab?.pendingUrl)) {
                return;
            }
            await browser.tabs.update(tabId, { url: this.blockedPageUrl() });
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
            allowedSites: {
                patterns: getAllowedSites(),
                usageDays: getUsageDays({ id: 'allowed' }, { allowed: getAllowedSiteUsage() }, now, TIME_ANALYTICS_RANGE_DAYS),
            },
            resetHour: 6,
            categoryBlockSupported: getManifestVersion() === 3,
            blockAdultGamblingSites: isAdultGamblingBlockEnabled(),
        };
    }

    /**
     * Name, time, delete, and site removal are locked after a timed group expires.
     * Adding sites to an expired group is still allowed.
     *
     * @param {string | null | undefined} groupId
     * @returns {Promise<object | null>}
     */
    async rejectLockedMutation(groupId) {
        const group = getSiteGroups().find((item) => item.id === groupId);
        if (group && isGroupSettingsLocked(group, getGroupUsage())) {
            return { saved: false, locked: true, ...(await this.getState()) };
        }
        return null;
    }

    /**
     * A site already on an expired group cannot be moved to a different group.
     *
     * @param {string | null | undefined} groupId
     * @param {string} domain
     * @returns {Promise<object | null>}
     */
    async rejectMovingFromLockedGroup(groupId, domain) {
        const owner = getSiteGroups().find((item) => item.domains.includes(domain));
        if (owner && owner.id !== groupId && isGroupSettingsLocked(owner, getGroupUsage())) {
            return { saved: false, locked: true, ...(await this.getState()) };
        }
        return null;
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
        if (isAlwaysBlockGroup(id)) {
            return { saved: false, protected: true, ...(await this.getState()) };
        }
        const locked = await this.rejectLockedMutation(id);
        if (locked) {
            return locked;
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
        if (isAlwaysBlockGroup(id)) {
            return { saved: false, protected: true, ...(await this.getState()) };
        }
        const locked = await this.rejectLockedMutation(id);
        if (locked) {
            return locked;
        }
        if (this.activeGroupId === id) {
            this.activeGroupId = null;
            this.activeAllowedPattern = null;
            this.activeHostname = null;
            this.lastTickAt = null;
        }
        if (!id) {
            return { saved: false, ...(await this.getState()) };
        }
        const deleted = deleteSiteGroup(id);
        await this.syncBlockedRules();
        await this.queueSync();
        await refreshOpenTabActionIcons().catch((error) => console.warn('Failed to refresh action icons', error));
        return { saved: deleted, ...(await this.getState()) };
    }

    /**
     * @param {{ groupId?: string, domain?: string, replaceAllowed?: boolean }} [options]
     */
    async handleAddDomain(options = {}) {
        const { groupId, domain, replaceAllowed } = options;
        await this._ready;
        const normalized = normalizeBlockedSite(domain);
        if (!groupId || !normalized) {
            return { saved: false, invalid: true, ...(await this.getState()) };
        }
        const lockedMove = await this.rejectMovingFromLockedGroup(groupId, normalized);
        if (lockedMove) {
            return lockedMove;
        }
        const overlappingAllowed = findOverlappingAllowedPatterns(getAllowedSites(), normalized);
        if (overlappingAllowed.length && isSanctuaryActive()) {
            return { saved: false, locked: true, sanctuaryLocked: true, ...(await this.getState()) };
        }
        if (overlappingAllowed.length && !replaceAllowed) {
            return {
                saved: false,
                needsAllowedConfirm: true,
                overlappingAllowed,
                domain: normalized,
                ...(await this.getState()),
            };
        }
        if (!getSiteGroups().some((item) => item.id === groupId)) {
            return { saved: false, ...(await this.getState()) };
        }
        if (overlappingAllowed.length && replaceAllowed) {
            removeAllowedSitePatterns(overlappingAllowed);
            await refreshCategoryAllowRules();
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
        await refreshOpenTabActionIcons().catch((error) => console.warn('Failed to refresh action icons', error));
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
        const locked = await this.rejectLockedMutation(groupId);
        if (locked) {
            return locked;
        }
        saveSiteGroups(removeDomainFromGroup(getSiteGroups(), groupId, domain));
        await this.syncBlockedRules();
        await this.queueSync();
        await refreshOpenTabActionIcons().catch((error) => console.warn('Failed to refresh action icons', error));
        return { saved: true, ...(await this.getState()) };
    }

    /**
     * @param {{ enabled?: unknown }} [options]
     */
    async handleSetAdultGamblingBlock(options = {}) {
        await this._ready;
        await setAdultGamblingBlockEnabled(Boolean(options.enabled));
        await this.redirectOpenBlockedTabs();
        return { saved: true, ...(await this.getState()) };
    }

    /**
     * @param {number} [tabId]
     * @returns {Promise<browser.Tabs.Tab | null>}
     */
    async resolvePopupTab(tabId) {
        if (typeof tabId === 'number') {
            try {
                const tab = await browser.tabs.get(tabId);
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

        const [fallback] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
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
                await this.startCounting(group, Date.now(), remaining, hostname);
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
