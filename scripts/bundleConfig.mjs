import fetch from 'node-fetch'
import fs from 'fs'
import config from '../shared/data/constants.js'

const outputEtagFile = './shared/data/etags.json'
const bundlePath = './shared/data/bundled/'
const configProps = config.tdsLists.find((c) => c.name === 'config')
const etags = {}

async function getConfig (name, url) {
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
}

async function fetchConfigs () {
    await getConfig('config', configProps.url)
    fs.writeFileSync(outputEtagFile, JSON.stringify(etags))
    console.log('Config imported successfully')
}

fetchConfigs()
