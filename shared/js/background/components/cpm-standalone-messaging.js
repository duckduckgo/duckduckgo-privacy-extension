import Site from '../classes/site';
import { sendPixelRequest } from '../pixels';

/**
 * @typedef {import('./cookie-prompt-management').CPMMessagingBase} CPMMessagingBase
 */

/**
 * CPM messaging for standalone extension.
 * @implements {CPMMessagingBase}
 */
export class CPMStandaloneMessaging {
    /** @param {{ remoteConfig: import('./remote-config').default }} opts */
    constructor({ remoteConfig }) {
        this.remoteConfig = remoteConfig;
    }

    async refreshDashboardState(tabId, url, dashboardState) {
        console.log('refreshDashboardState', tabId, url, dashboardState);
        // no-op
    }

    async showCpmAnimation(tabId, topUrl, isCosmetic) {
        console.log('showCpmAnimation', tabId, topUrl, isCosmetic);
        // no-op
    }

    async notifyPopupHandled(tabId, msg) {
        console.log('notifyPopupHandled', tabId, msg);
        // no-op
    }

    async checkAutoconsentEnabledForSite(url) {
        await this.remoteConfig.ready;
        const site = new Site(url);
        return site.isFeatureEnabled('autoconsent');
    }

    async checkSubfeatureEnabled(subfeatureName) {
        await this.remoteConfig.ready;
        return this.remoteConfig.isSubFeatureEnabled('autoconsent', subfeatureName, 'treatment');
    }

    async sendPixel(pixelName, type, params) {
        if (type === 'daily') {
            // emulate "daily" pixel firing
            pixelName = `${pixelName}_daily`;
            const lastSent = this.remoteConfig.settings.getSetting('pixelsLastSent') || {}
            if (lastSent[pixelName] && lastSent[pixelName] > Date.now() - 1000 * 60 * 60 * 24) {
                return;
            }
            lastSent[pixelName] = Date.now();
            this.remoteConfig.settings.updateSetting('pixelsLastSent', lastSent);
        }
        return sendPixelRequest(pixelName, params);
    }

    async refreshRemoteConfig() {
        console.log(`fetching config`);
        await this.remoteConfig.ready;
        await this.remoteConfig.checkForUpdates(false);
        return this.remoteConfig.config;
    }
}
