import browser from 'webextension-polyfill';
import { getOsName } from '../utils';
import { buildSearchUrl } from '../../shared-utils/search-engine';
import settings from '../settings';

export default class OmniboxSearch {
    constructor() {
        this.apiAvailable = !!browser.omnibox;
        if (this.apiAvailable) {
            // search via omnibox
            browser.omnibox.onInputEntered.addListener(async function (text) {
                await settings.ready();
                const tabs = await browser.tabs.query({
                    currentWindow: true,
                    active: true,
                });
                browser.tabs.update(tabs[0].id, {
                    url: buildSearchUrl(text, settings.getSetting('searchEngine'), {
                        osName: getOsName(),
                        bextSuffix: 'cl',
                    }),
                });
            });
        }
    }
}
