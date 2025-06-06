/* This class contains information about what trackers and sites
 * are on a given tab:
 *  id: Chrome tab id
 *  url: url of the tab
 *  site: ref to a Site object
 *  trackers: {object} all trackers requested on page/tab (listed by company)
 *      is in this format:
 *      {
 *         '<companyName>': {
 *              parentCompany: ref to a Company object
 *              urls: all unique tracker urls we have seen for this company
 *              count: total number of requests to unique tracker urls for this company
 *          }
 *      }
 */
import { getCurrentCohorts, enrollCurrentExperiments } from '../utils';
const Site = require('./site').default;
const { Tracker } = require('./tracker');
const HttpsRedirects = require('./https-redirects');
const Companies = require('../companies');
const webResourceKeyRegex = /.*\?key=(.*)/;
const { AdClickAttributionPolicy } = require('./ad-click-attribution-policy');
const { TabState } = require('./tab-state');

/** @typedef {{tabId: number, url: string | undefined, requestId?: string, status: string | null | undefined}} TabData */

class Tab {
    /**
     * @param {TabData|TabState} tabData
     */
    constructor(tabData) {
        if (tabData instanceof TabState) {
            /** @type {TabState} */
            this._tabState = tabData;
        } else {
            /** @type {TabState} */
            this._tabState = new TabState(tabData);
        }

        this.site = new Site(this.url, this._tabState);
        this.httpsRedirects = new HttpsRedirects();
        this.webResourceAccess = [];
        this.surrogates = {};
        this.initExperiments();
    }

    // Responsible for storing the experiments that ran on the page, so stale tabs don't report the wrong experiments.
    initExperiments() {
        enrollCurrentExperiments();
        const experiments = getCurrentCohorts();
        // Order by key
        experiments.sort((a, b) => a.key.localeCompare(b.key));
        // turn into an object
        this.contentScopeExperiments = {};
        for (const experiment of experiments) {
            this.contentScopeExperiments[experiment.key] = experiment.value;
        }
    }

    /**
     * @param {number} tabId
     */
    static async restore(tabId) {
        const state = await TabState.restore(tabId);
        if (!state) {
            return null;
        }
        return new Tab(state);
    }

    set referrer(value) {
        this._tabState.setValue('referrer', value);
    }

    get referrer() {
        return this._tabState.referrer;
    }

    get contentScopeExperiments() {
        return this._tabState.contentScopeExperiments;
    }

    set contentScopeExperiments(value) {
        this._tabState.setValue('contentScopeExperiments', value);
    }

    set adClick(value) {
        this._tabState.setValue('adClick', value);
    }

    get adClick() {
        return this._tabState.adClick;
    }

    set firstAdAttributionAllowed(value) {
        this._tabState.setValue('firstAdAttributionAllowed', value);
    }

    get firstAdAttributionAllowed() {
        return this._tabState.firstAdAttributionAllowed;
    }

    set disabledClickToLoadRuleActions(value) {
        this._tabState.setValue('disabledClickToLoadRuleActions', value);
    }

    get disabledClickToLoadRuleActions() {
        return this._tabState.disabledClickToLoadRuleActions;
    }

    set dnrRuleIdsByDisabledClickToLoadRuleAction(value) {
        this._tabState.setValue('dnrRuleIdsByDisabledClickToLoadRuleAction', value);
    }

    get dnrRuleIdsByDisabledClickToLoadRuleAction() {
        return this._tabState.dnrRuleIdsByDisabledClickToLoadRuleAction;
    }

    set trackers(value) {
        this._tabState.setValue('trackers', value);
    }

    get trackers() {
        return this._tabState.trackers;
    }

    get url() {
        return this._tabState.url;
    }

    set url(url) {
        this._tabState.setValue('url', url);
    }

    get id() {
        return this._tabState.tabId;
    }

    set id(tabId) {
        this._tabState.setValue('tabId', tabId);
    }

    get upgradedHttps() {
        return this._tabState.upgradedHttps;
    }

    set upgradedHttps(value) {
        this._tabState.setValue('upgradedHttps', value);
    }

    get hasHttpsError() {
        return this._tabState.hasHttpsError;
    }

    set hasHttpsError(value) {
        this._tabState.setValue('hasHttpsError', value);
    }

    get mainFrameUpgraded() {
        return this._tabState.mainFrameUpgraded;
    }

    set mainFrameUpgraded(value) {
        this._tabState.setValue('mainFrameUpgraded', value);
    }

    get urlParametersRemoved() {
        return this._tabState.urlParametersRemoved;
    }

    set urlParametersRemoved(value) {
        this._tabState.setValue('urlParametersRemoved', value);
    }

    get urlParametersRemovedUrl() {
        return this._tabState.urlParametersRemovedUrl;
    }

    set urlParametersRemovedUrl(value) {
        this._tabState.setValue('urlParametersRemovedUrl', value);
    }

    get ampUrl() {
        return this._tabState.ampUrl;
    }

    set ampUrl(url) {
        this._tabState.setValue('ampUrl', url);
    }

    get cleanAmpUrl() {
        return this._tabState.cleanAmpUrl;
    }

    get requestId() {
        return this._tabState.requestId;
    }

    set cleanAmpUrl(url) {
        this._tabState.setValue('cleanAmpUrl', url);
    }

    get status() {
        return this._tabState.status;
    }

    set status(value) {
        this._tabState.setValue('status', value);
    }

    get statusCode() {
        return this._tabState.statusCode;
    }

    set statusCode(value) {
        this._tabState.setValue('statusCode', value);
    }

    get ctlYouTube() {
        return this._tabState.ctlYouTube;
    }

    set ctlYouTube(value) {
        this._tabState.setValue('ctlYouTube', value);
    }

    get ctlFacebookPlaceholderShown() {
        return this._tabState.ctlFacebookPlaceholderShown;
    }

    set ctlFacebookPlaceholderShown(value) {
        this._tabState.setValue('ctlFacebookPlaceholderShown', value);
    }

    get ctlFacebookLogin() {
        return this._tabState.ctlFacebookLogin;
    }

    set ctlFacebookLogin(value) {
        this._tabState.setValue('ctlFacebookLogin', value);
    }

    get debugFlags() {
        return this._tabState.debugFlags;
    }

    set debugFlags(value) {
        this._tabState.setValue('debugFlags', value);
    }

    get errorDescriptions() {
        return this._tabState.errorDescriptions;
    }

    set errorDescriptions(value) {
        this._tabState.setValue('errorDescriptions', value);
    }

    get httpErrorCodes() {
        return this._tabState.httpErrorCodes;
    }

    set httpErrorCodes(value) {
        this._tabState.setValue('httpErrorCodes', value);
    }

    get performanceWarning() {
        return this._tabState.performanceWarning;
    }

    set performanceWarning(value) {
        this._tabState.setValue('performanceWarning', value);
    }

    get userRefreshCount() {
        return this._tabState.userRefreshCount;
    }

    set userRefreshCount(value) {
        this._tabState.setValue('userRefreshCount', value);
    }

    get openerContext() {
        return this._tabState.openerContext;
    }

    set openerContext(value) {
        this._tabState.setValue('openerContext', value);
    }

    get jsPerformance() {
        return this._tabState.jsPerformance;
    }

    set jsPerformance(value) {
        this._tabState.setValue('jsPerformance', value);
    }

    get locale() {
        return this._tabState.locale;
    }

    set locale(value) {
        this._tabState.setValue('locale', value);
    }

    /**
     * If given a valid adClick redirect, set the adClick to the tab.
     * @param {string} requestURL
     */
    setAdClickIfValidRedirect(requestURL) {
        const policy = this.getAdClickAttributionPolicy();
        const adClick = policy.createAdClick(requestURL, this);
        if (adClick) {
            this.adClick = adClick;
        }
    }

    /**
     * @returns {AdClickAttributionPolicy}
     */
    getAdClickAttributionPolicy() {
        this._adClickAttributionPolicy = this._adClickAttributionPolicy || new AdClickAttributionPolicy();
        return this._adClickAttributionPolicy;
    }

    /**
     * Returns true if a resource should be permitted when the tab is in the adClick state.
     * @param {string} resourcePath
     * @returns {boolean}
     */
    allowAdAttribution(resourcePath) {
        if (!this.site.isFeatureEnabled('adClickAttribution') || !this.adClick || !this.adClick.allowAdAttribution(this)) return false;
        const policy = this.getAdClickAttributionPolicy();
        const permitted = policy.resourcePermitted(resourcePath);
        if (permitted) {
            this.adClick.requestWasAllowed(this);
        }

        return permitted;
    }

    updateSite(url) {
        if (this.site.url === url) return;

        this.url = url;
        this.site = new Site(url, this._tabState);
        this.userRefreshCount = 0;
    }

    // Store all trackers for a given tab even if we don't block them.
    /**
     * @param t
     * @param {string} baseDomain
     * @param {string} url
     * @returns {Tracker}
     */
    addToTrackers(t, baseDomain, url) {
        const trackers = this.trackers;
        const tracker = this.trackers[t.tracker.owner.name];

        if (tracker) {
            tracker.addTrackerUrl(t, this.url || '', baseDomain, url);
        } else if (t.tracker) {
            const newTracker = new Tracker(t);
            newTracker.addTrackerUrl(t, this.url || '', baseDomain, url);
            this.trackers[t.tracker.owner.name] = newTracker;

            // first time we have seen this network tracker on the page
            if (t.tracker.owner.name !== 'unknown') Companies.countCompanyOnPage(t.tracker.owner);
        }
        // Set the trackers on the tab which will trigger a state update
        this.trackers = trackers;
        return this.trackers[t.tracker.owner.name];
    }

    /**
     * Adds an entry to the tab webResourceAccess list.
     * @param {string} resourceName URL to the web accessible resource
     * @returns {string} generated access key
     **/
    addWebResourceAccess(resourceName) {
        // random 8-9 character key for web resource access
        const key = Math.floor(Math.random() * 10000000000).toString(16);
        this.webResourceAccess.push({ key, resourceName, time: Date.now(), wasAccessed: false });
        return key;
    }

    /**
     * Access to web accessible resources needs to have the correct key passed in the URL
     * and the requests needs to happen within 1 second since the generation of the key
     * in addWebResourceAccess
     * @param {string} resourceURL web accessible resource URL
     * @returns {boolean} is access to the resource allowed
     **/
    hasWebResourceAccess(resourceURL) {
        // no record of web resource access for this tab
        if (!this.webResourceAccess.length) {
            return false;
        }

        const keyMatches = webResourceKeyRegex.exec(resourceURL);
        if (!keyMatches) {
            return false;
        }

        const key = keyMatches[1];
        const hasAccess = this.webResourceAccess.some((resource) => {
            if (resource.key === key && !resource.wasAccessed) {
                resource.wasAccessed = true;
                if (Date.now() - resource.time < 1000) {
                    return true;
                }
            }
            return false;
        });

        return hasAccess;
    }

    /**
     * This method sets ampUrl. In cases where ampUrl is already set with an AMP url and the new url is
     * contained in the current ampUrl, we don't want to set ampUrl to the new url. This is because in some cases
     * simple amp urls (e.g. google.com/amp) will contain another amp url as the extacted url.
     *
     * @param {string} url - the url to set ampUrl to
     */
    setAmpUrl(url) {
        if (this.ampUrl) {
            const ampUrl = new URL(this.ampUrl);
            const newUrl = new URL(url);
            if (ampUrl.hostname.includes('google') && ampUrl.pathname.includes(newUrl.hostname)) {
                return;
            }
        }

        this.ampUrl = url;
    }

    /**
     * Post a message to the devtools panel for this tab
     * @param {Object} devtools
     * @param {string} action
     * @param {Object} message
     */
    postDevtoolsMessage(devtools, action, message) {
        devtools.postMessage(this.id, action, message);
    }
}

module.exports = Tab;
