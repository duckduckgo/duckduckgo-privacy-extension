import fetch from 'node-fetch'
import fs from 'fs'

async function init () {
    const outPath = 'integration-test/artifacts/attribution.json'
    const testCasesUrl = 'https://www.search-company.site/shared/testCases.json'
    const result = await fetch(testCasesUrl)
    const testCases = await result.json()
    fs.writeFileSync(outPath, JSON.stringify(testCases, undefined, 2))
}

init()
