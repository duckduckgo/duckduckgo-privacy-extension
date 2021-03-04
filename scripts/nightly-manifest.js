const fs = require('fs')

const manifest = JSON.parse(fs.readFileSync(process.stdin.fd, 'utf-8'))
const gecko = manifest.applications.gecko
gecko.id = 'firefox-beta@duckduckgo.com'
gecko.update_url = 'https://sammacbeth.github.io/duckduckgo-privacy-extension/updates.json'
manifest.version = process.env.GITHUB_REF || process.env.VERSION
console.log(JSON.stringify(manifest, null, 4))
