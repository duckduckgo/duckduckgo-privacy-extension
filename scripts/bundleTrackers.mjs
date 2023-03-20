import fetch from 'node-fetch'
import fs from 'fs'
import config from '../shared/data/constants.js'

const configProps = config.tdsLists.find((c) => c.name === 'tds')
const outputFile = './shared/data/bundled/tracker-lookup.json'
const resp = await fetch(configProps.url)
const tds = await resp.json()

// Build a trie of tracker domains, starting with the broadest subdomain. Leaves are set to 1 to indicate success
// i.e. lookup['com']['example'] === 1 if example.com is a tracker domain
const trackerLookupTrie = {}
function insert (domainParts, node) {
    if (domainParts.length === 1) {
        node[domainParts[0]] = 1
    } else if (node[domainParts[0]]) {
        insert(domainParts.slice(1), node[domainParts[0]])
    } else {
        node[domainParts[0]] = {}
        insert(domainParts.slice(1), node[domainParts[0]])
    }
}
Object.keys(tds.trackers).forEach((tracker) => {
    insert(tracker.split('.').reverse(), trackerLookupTrie)
})

fs.writeFileSync(outputFile, JSON.stringify(trackerLookupTrie));
console.log(`Wrote ${JSON.stringify(Object.keys(tds.trackers)).length} trackers to ${outputFile}`)
