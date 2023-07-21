import { dirname } from 'path'

import { readEtags, writeEtags } from './utils.mjs'

function listConstants (listName) {
    return {
        url: `https://staticcdn.duckduckgo.com/trackerblocking/v6/${listName}/extension-mv3-tds.json`,
        path: `./build/.intermediates/${listName}-mv3-tds.json`,
        etagKey: `${listName}-mv3-tds-etag`
    }
}

async function fetchBlocklistEtag (url) {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error('Failed to fetch MV3 blocklist from ' + url)
    }

    return response.headers.get('etag')?.split('"')[1]
}

async function updateBlocklists () {
    const existingEtags = readEtags()

    let changes = false
    const latestEtags = {}
    for (const listName of ['current', 'fallback']) {
        const { url, path, etagKey } = listConstants(listName)

        const existingEtag = existingEtags[etagKey]
        const latestEtag = await fetchBlocklistEtag(url)
        latestEtags[etagKey] = latestEtag

        if (!latestEtag) {
            throw new Error('Failed to check latest MV3 blocklist etags')
        }

        if (latestEtag !== existingEtag) {
            console.log(`Updating ${listName} MV3 blocklist to ${latestEtag}`)
            changes = true
        }
    }

    if (changes) {
        writeEtags(latestEtags)
    }
    else {
        console.log('MV3 blocklists already up to date, no update necessary.')
    }
}

updateBlocklists()
