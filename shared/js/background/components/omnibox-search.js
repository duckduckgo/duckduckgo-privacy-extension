import browser from 'webextension-polyfill';
import { getOsName } from '../utils';

export default class OmniboxSearch {
    constructor() {
        this.apiAvailable = !!browser.omnibox;
        if (this.apiAvailable) {
            // search via omnibox
            browser.omnibox.onInputEntered.addListener(async function (text) {
                const tabs = await browser.tabs.query({
                    currentWindow: true,
                    active: true,
                });
                const url = new URL('https://duckduckgo.com');
                url.searchParams.set('q', text);
                url.searchParams.set('bext', getOsName() + 'cl');
                browser.tabs.update(tabs[0].id, {
                    url: url.toString(),
                });
            });
        }
    }
}
