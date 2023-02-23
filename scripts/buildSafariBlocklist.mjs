import fs from 'fs/promises'
import path from 'path'
import { generateTdsRuleset } from '@duckduckgo/ddg2dnr/lib/tds.js'

function convertDnrRule (accumulator, rule) {
    let { ruleset, nextId } = accumulator
    if (rule.condition.excludedInitiatorDomains) {
        // subdomain matching prefix
        rule.condition.excludedDomains = rule.condition.excludedInitiatorDomains.map(d => `*${d}`)
        delete rule.condition.excludedInitiatorDomains
    }
    if (rule.condition.initiatorDomains) {
        // subdomain matching prefix
        rule.condition.domains = rule.condition.initiatorDomains.map(d => `*${d}`)
        delete rule.condition.initiatorDomains
    }
    if (rule.condition.requestDomains) {
        if (rule.condition.regexFilter) {
            // skip regex rules for the moment
            return
        }
        for (const domain of rule.condition.requestDomains) {
            const urlFilter = rule.condition.urlFilter || `||${domain}/`
            if (rule.condition.urlFilter && !rule.condition.urlFilter.includes(domain)) {
                // console.warn(`skip requestDomain ${domain} with filter ${rule.condition.urlFilter} (no-op rule)`)
                continue
            }
            const ruleCopy = JSON.parse(JSON.stringify(rule))
            delete ruleCopy.condition.requestDomains
            ruleCopy.condition.urlFilter = urlFilter
            ruleCopy.id = nextId++
            ruleset.push(ruleCopy)
        }
    } else {
        rule.id = nextId++
        ruleset.push(rule)
    }
    return { ruleset, nextId }
}

(async () => {
    // Collect and merge surrogates from node_modules into web_accessible_resources
    const extensionDir = path.join('browsers', 'safari', 'Shared (Extension)', 'Resources')
    const surrogatesDir = path.join('node_modules', '@duckduckgo', 'tracker-surrogates', 'surrogates')
    const warDir = path.join(extensionDir, 'web_accessible_resources')
    const existingSurrogates = await fs.readdir(warDir)
    const availableSurrogates = await fs.readdir(surrogatesDir)
    const linkSurrogates = availableSurrogates.map(async (file) => {
        if (!existingSurrogates.includes(file)) {
            await fs.symlink(path.join(surrogatesDir, file), path.join(warDir, file))
        }
    })
    await Promise.all(linkSurrogates)
    // Fetch TDS, build ruleset, and convert to Safari compatible rules.
    const request = await fetch('https://staticcdn.duckduckgo.com/trackerblocking/v4/tds.json')
    const tds = await request.json()
    const rules = await generateTdsRuleset(tds, new Set(availableSurrogates), '/web_accessible_resources/', () => false)
    const conversionResult = rules.ruleset.reduce(convertDnrRule, { ruleset: [], nextId: 1 })

    if (!(await fs.readdir(extensionDir)).includes('data')) {
        await fs.mkdir(path.join(extensionDir, 'data'))
    }
    // Write TDS to disk
    await fs.writeFile(path.join(extensionDir, 'data', 'tds.json'), JSON.stringify(tds))
    // Write DNR blocklist to disk
    await fs.writeFile(path.join(extensionDir, 'data', 'tds-rules.json'), JSON.stringify(conversionResult.ruleset, undefined, 2))
})()
