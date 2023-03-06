import fs from 'fs/promises'
import { generateTdsRuleset } from '@duckduckgo/ddg2dnr/lib/tds.js'
import { convertDNRRuleset } from '../shared/js/background/safai-compat.mjs'

(async () => {
    const tdsPath = process.argv[2]
    const surrogatesPath = process.argv[3]
    const rulesPath = process.argv[4]
    // Collect and merge surrogates from node_modules into web_accessible_resources
    const availableSurrogates = await fs.readdir(surrogatesPath)

    // Fetch TDS, build ruleset, and convert to Safari compatible rules.
    const tds = JSON.parse(await fs.readFile(tdsPath, { encoding: 'utf-8' }))
    const rules = await generateTdsRuleset(tds, new Set(availableSurrogates), '/web_accessible_resources/', () => false)
    const convertedRules = convertDNRRuleset(rules.ruleset)

    // Write DNR blocklist to disk
    await fs.writeFile(rulesPath, JSON.stringify(convertedRules, undefined, 2))
})()
