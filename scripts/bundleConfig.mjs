import fetch from 'node-fetch'
import fs from 'fs'
import config from '../shared/data/constants.js'

import { writeEtags } from './utils.mjs'

const bundlePath = './shared/data/bundled/'
const configProps = config.tdsLists.find((c) => c.name === 'config')

async function getConfig(name, url) {
    const etags = {}
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to load tds list ${name}: ${url}`)
    }
    etags[`${name}-etag`] = response.headers.get('etag')
    const fileText = await response.text()
    // Will throw if invalid JSON
    JSON.parse(fileText)
    const urlObject = new URL(url)
    const fileName = urlObject.pathname.split('/').pop()
    fs.writeFileSync(`${bundlePath}/${fileName}`, fileText)
    return etags
}

async function fetchConfigs() {
    const etags = await getConfig('config', configProps.url)
    writeEtags(etags)
    console.log('Config imported successfully')
}

fetchConfigs()
