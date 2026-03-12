import browser from 'webextension-polyfill';

export const ALTERNATIVE_SEARCH_SUBDOMAINS = ['noai', 'safe'];

export default class SearchChoice {
    /**
     * @param {{
     *  settings: import('../settings.js');
     * }} options
     */
    constructor({ settings }) {
        browser.webNavigation.onBeforeNavigate.addListener((details) => {
            const subdomain = settings.getSetting('alternativeSearch');
            if (ALTERNATIVE_SEARCH_SUBDOMAINS.includes(subdomain)) {
                try {
                    const url = new URL(details.url);
                    const isSerp = url.hostname === 'duckduckgo.com' && url.pathname === '/' && url.searchParams.has('q');
                    const isStartPage = url.hostname === 'start.duckduckgo.com';
                    if (isSerp || isStartPage) {
                        url.hostname = `${subdomain}.duckduckgo.com`;
                        browser.tabs.update(details.tabId, { url: url.toString() });
                    }
                } catch (e) {}
            }
        });
    }
}
