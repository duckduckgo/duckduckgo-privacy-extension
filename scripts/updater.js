const fs = require('fs')

const addonId = 'firefox-beta@duckduckgo.com'
const [, , updateFile, version, xpiUrl] = process.argv
const updateManifest = JSON.parse(fs.readFileSync(updateFile, 'utf-8'))
updateManifest.addons[addonId].updates.push({
    version,
    update_link: xpiUrl
})
console.log(JSON.stringify(updateManifest, null, 2))
