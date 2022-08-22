import { getFromSessionStorage, setToSessionStorage } from '../background/wrapper.es6'

const CONFIG_KEY = 'cachedConfig'

export class Config {
    constructor () {
        this.data = {}
        this.readyPromise = this.init()
    }

    async ready () {
        await this.readyPromise
    }

    async init () {
        const configData = await getFromSessionStorage(CONFIG_KEY)
        this.data = configData ? JSON.parse(configData) : {}
    }

    // TODO consider sync with other Config objects across contexts
    static async save (configData) {
        await setToSessionStorage(CONFIG_KEY, JSON.stringify(configData))
    }
}

export const config = new Config()
