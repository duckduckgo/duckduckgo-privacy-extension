const fs = require('fs')

const day = new Date()
const manifest = JSON.parse(fs.readFileSync(process.stdin.fd, 'utf-8'))
const gecko = manifest.applications.gecko
gecko.id = 'firefox-beta@duckduckgo.com'
gecko.update_url = 'https://sammacbeth.github.io/duckduckgo-privacy-extension/updates.json'
manifest.version = `${day.getUTCFullYear()}.${day.getUTCMonth() + 1}.${day.getUTCDate()}`
console.log(JSON.stringify(manifest, null, 4))
