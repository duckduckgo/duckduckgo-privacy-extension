import browser from 'webextension-polyfill';
import parseUserAgentString from '../shared-utils/parse-user-agent-string';
import { buildSearchUrl } from '../shared-utils/search-engine';
import { getExtensionURL } from './wrapper';
import { reloadCurrentTab } from './utils';
import tdsStorage from './storage/tds';
import { getArgumentsObject } from './helpers/arguments-object';
import { resolveBreakageReportRequest } from './breakage-report-request';
import { postPopupMessage } from './popup-messaging';
import ToggleReports from './components/toggle-reports';
import messageHandlers from './message-registry';
import { getBlockedSites, setBlockedSites } from './dnr-user-blocklist';

const utils = require('./utils');
const settings = require('./settings');
const tabManager = require('./tab-manager');
const Companies = require('./companies');
const browserName = utils.getBrowserName();
const devtools = require('./devtools');
const browserWrapper = require('./wrapper');

export async function registeredContentScript(options, sender, req) {
    const sessionKey = await utils.getSessionKey();
    const argumentsObject = getArgumentsObject(sender.tab.id, sender, options?.documentUrl || req.documentUrl, sessionKey);
    if (!argumentsObject) {
        // No info for the tab available, do nothing.
        return;
    }
    return argumentsObject;
}

export function resetTrackersData() {
    return Companies.resetData();
}

export function getExtensionVersion() {
    return browserWrapper.getExtensionVersion();
}

/**
 * This is used from the options page - to manually update the user allow list
 *
 * @param options
 */
export function setList(options) {
    tabManager.setList(options);
}

/**
 * This is used by the Dashboard to update the allow/deny lists, close the popup + reload
 *
 * @param {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').SetListOptions} options
 */
export async function setLists(options) {
    // Is the user clicking to disable protections for the website (aka
    // allowlisting the website), or enabling protections for the website again?
    let allowlisting = false;

    // TODO: Consider making these tabManager.setList calls concurrently with
    //       Promise.all, but first verify that works in practice (e.g. with
    //       simultaneous DNR rule updates).
    for (const listItem of options.lists) {
        if (listItem.value && listItem.list === 'allowlisted') {
            allowlisting = true;
        }
        await tabManager.setList(listItem);
    }

    // If the user is disabling protections for the page and the conditions are
    // met, display a prompt asking the user to send a breakage report before
    // reloading the page.
    if (allowlisting && (await ToggleReports.shouldDisplay())) {
        postPopupMessage({ messageType: 'toggleReport' });
        return;
    }

    try {
        postPopupMessage({ messageType: 'closePopup' });
        await reloadCurrentTab();
    } catch (e) {
        console.error('Error trying to reload+refresh following `setLists` message', e);
    }
}

export function allowlistOptIn(optInData) {
    tabManager.setGlobalAllowlist('allowlistOptIn', optInData.domain, optInData.value);
}

// popup will ask for the browser type then it is created
export function getBrowser() {
    return browserName;
}

export function openOptions() {
    if (browserName === 'moz') {
        browser.tabs.create({ url: getExtensionURL('/html/options.html') });
    } else {
        browser.runtime.openOptionsPage();
    }
}

export function getTopBlockedByPages(options) {
    return Companies.getTopBlockedByPages(options);
}

export async function updateSetting({ name, value }) {
    await settings.ready();
    settings.updateSetting(name, value);
    utils.sendAllTabsMessage({ messageType: `ddg-settings-${name}`, value });
    return { messageType: `ddg-settings-${name}`, value };
}

export async function getSetting({ name }) {
    await settings.ready();
    return settings.getSetting(name);
}

export function getTopBlocked(options) {
    return Companies.getTopBlocked(options);
}

export function getListContents(list) {
    const loader = globalThis.components.tds[list];
    return {
        data: tdsStorage.getSerializableList(list),
        etag: loader.etag,
    };
}

/**
 * Manually override the value of a list
 * @param {{ name: string, value: object}} list value
 */
export async function setListContents({ name, value }) {
    const loader = globalThis.components.tds[name];
    await loader.overrideDataValue(value);
    return loader.etag;
}

export async function reloadList(listName) {
    await globalThis.components.tds[listName].checkForUpdates(true);
}

export function debuggerMessage(message, sender) {
    devtools.postMessage(sender.tab?.id, message.action, message.message);
}

export async function search({ term }) {
    await settings.ready();
    const browserInfo = parseUserAgentString();
    const url = buildSearchUrl(term, settings.getSetting('searchEngine'), {
        osName: browserInfo?.os,
        bextSuffix: 'cr',
    });
    browser.tabs.create({ url });
}

export function openShareFeedbackPage() {
    return browserWrapper.openExtensionPage('/html/feedback.html');
}

export function addDebugFlag(message, sender, req) {
    const tab = tabManager.get({ tabId: sender.tab.id });
    if (!tab) return;
    const flags = new Set(tab.debugFlags);
    flags.add(message.flag);
    tab.debugFlags = [...flags];
}

/**
 * Handler for breakage report data received from content-scope-scripts
 * Stores detector data and performance metrics on the tab object
 * @param {Object} data - Breakage report data from content-scope-scripts
 * @param {Object} sender - Message sender information
 */
export function breakageReportResult(data, sender) {
    // Only accept data from main frame (frameId 0) to avoid iframe data overwriting main frame data
    if (sender?.frameId !== 0) {
        return;
    }

    const tab = tabManager.get({ tabId: sender.tab.id });
    if (!tab) return;

    if (!data) return;

    tab.breakageReportData = data;

    // Resolve any pending request for this tab
    resolveBreakageReportRequest(sender.tab.id, data);
}

export function healthCheckRequest() {
    return true;
}

export async function rescheduleCounterMessagingRequest() {
    await settings.ready();
    settings.updateSetting('rescheduleCounterMessagingOnStart', true);
    return true;
}

/**
 * Default set of message handler functions used by the background message handler.
 *
 * Don't add new listeners to this list, instead import and call registerMessageHandler in your
 * feature's initialization code!
 */
export function registerStandardHandlers() {
    Object.assign(messageHandlers, {
        registeredContentScript,
        resetTrackersData,
        getExtensionVersion,
        setList,
        setLists,
        allowlistOptIn,
        getBrowser,
        openOptions,
        getTopBlockedByPages,
        updateSetting,
        getSetting,
        getTopBlocked,
        getListContents,
        setListContents,
        reloadList,
        debuggerMessage,
        search,
        openShareFeedbackPage,
        addDebugFlag,
        breakageReportResult,
        healthCheckRequest,
        rescheduleCounterMessagingRequest,
        getBlockedSites,
        setBlockedSites,
    });
}
