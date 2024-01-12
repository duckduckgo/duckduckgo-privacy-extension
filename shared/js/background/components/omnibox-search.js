import browser from 'webextension-polyfill'
import { getOsName } from '../utils'

export default class OmniboxSearch {
    constructor () {
        this.apiAvailable = !!browser.omnibox
        if (this.apiAvailable) {
            // search via omnibox
            browser.omnibox.onInputEntered.addListener(async function (text) {
                const tabs = await browser.tabs.query({
                    currentWindow: true,
                    active: true
                })
                browser.tabs.update(tabs[0].id, {
                    url: 'https://duckduckgo.com/?q=' + encodeURIComponent(text) + '&bext=' + getOsName() + 'cl'
                })
            })
        }
    }
}
