const fs = require('fs')

const manifest = JSON.parse(fs.readFileSync(process.stdin.fd, 'utf-8'))
const gecko = manifest.applications.gecko
gecko.id = 'firefox-beta@duckduckgo.com'
gecko.update_url = 'https://sammacbeth.github.io/duckduckgo-privacy-extension/updates.json'

const day = new Date()
const versionRegex = /^[0-9]{4}.[0-9]{1,2}.[0-9]{1,2}$/
manifest.name += ' (Beta)'
manifest.version = process.env.VERSION || `${day.getUTCFullYear()}.${day.getUTCMonth() + 1}.${day.getUTCDate()}`
if (process.env.GITHUB_REF && process.env.GITHUB_REF.startsWith('refs/tags/')) {
    // in CI we pull the version from the tag ref
    manifest.version = process.env.GITHUB_REF.slice(10)
}
if (!versionRegex.test(manifest.version)) {
    throw new Error(`Version does not match expected format ${manifest.version}`)
}
console.log(JSON.stringify(manifest, null, 4))
