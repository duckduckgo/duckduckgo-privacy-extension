import { dirname } from 'path'
import { mkdirSync, writeFileSync } from 'fs'

import { md5sum, readEtags } from './utils.mjs'

const currentTdsPath = './build/.intermediates/current-mv3-tds.json'
const fallbackTdsPath = './build/.intermediates/fallback-mv3-tds.json'

const etagTdsURL =
      etag => `https://staticcdn.duckduckgo.com/trackerblocking/tds/by-hash/tds-${etag}.json`

async function download (url, path) {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error('Failed to fetch MV3 blocklist from ' + url)
    }
    const fileText = await response.text()
    writeFileSync(path, fileText)
}

async function ensureBlocklists () {
    const {
        'current-mv3-tds-etag': targetCurrentEtag,
        'fallback-mv3-tds-etag': targetFallbackEtag
    } = readEtags()

    if (!targetCurrentEtag || !targetFallbackEtag) {
        throw new Error('Missing MV3 blocklist entries in etags.json')
    }

    const existingCurrentEtag = md5sum(currentTdsPath)
    const existingFallbackEtag = md5sum(fallbackTdsPath)

    if (existingCurrentEtag && existingCurrentEtag === targetCurrentEtag &&
        existingFallbackEtag && existingFallbackEtag === targetFallbackEtag) {
        console.log('No need to fetch MV3 blocklists, already up to date.')
        return
    }

    mkdirSync(dirname(currentTdsPath), { recursive: true })
    await download(etagTdsURL(targetCurrentEtag), currentTdsPath)
    await download(etagTdsURL(targetFallbackEtag), fallbackTdsPath)

    console.log('Fetched MV3 blocklists successfully.')
}

ensureBlocklists()
