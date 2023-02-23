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
    const tdsPath = process.argv[2]
    const surrogatesPath = process.argv[3]
    const rulesPath = process.argv[4]
    // Collect and merge surrogates from node_modules into web_accessible_resources
    const availableSurrogates = await fs.readdir(surrogatesPath)

    // Fetch TDS, build ruleset, and convert to Safari compatible rules.
    const tds = JSON.parse(await fs.readFile(tdsPath, { encoding: 'utf-8' }))
    const rules = await generateTdsRuleset(tds, new Set(availableSurrogates), '/web_accessible_resources/', () => false)
    const conversionResult = rules.ruleset.reduce(convertDnrRule, { ruleset: [], nextId: 1 })

    // Write DNR blocklist to disk
    await fs.writeFile(rulesPath, JSON.stringify(conversionResult.ruleset, undefined, 2))
})()
