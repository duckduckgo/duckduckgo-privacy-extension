const fs = require('fs')

const addonId = 'firefox-beta@duckduckgo.com'
const [, , updateFile, version, xpiUrl] = process.argv
console.log('args', updateFile, version, xpiUrl)
const updateManifest = JSON.parse(fs.readFileSync(updateFile, 'utf-8'))
updateManifest.addons[addonId].updates.push({
    version,
    update_link: xpiUrl
})
fs.writeFileSync(updateFile, JSON.stringify(updateManifest, null, 2), 'utf-8')
