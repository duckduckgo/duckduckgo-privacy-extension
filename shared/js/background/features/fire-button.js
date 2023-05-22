import browser from 'webextension-polyfill'
import { addMessageHandler } from '../message-handlers'

export default class FireButton {
    constructor () {
        addMessageHandler('doBurn', this.burn.bind(this))
    }

    async burn () {
        const step1 = await browser.browsingData.remove({

        }, {
            cache: true,
            serviceWorkers: true,
            downloads: true,
        })
        console.log('clearing 🔥 step 1', { result: step1 })
        return true
    }
}
