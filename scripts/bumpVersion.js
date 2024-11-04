const fs = require('fs')

const newVersion = process.argv[2]

for (const browser of ['chrome', 'firefox', 'chrome-mv2']) {
    const manifest = fs.readFileSync(`browsers/${browser}/manifest.json`, 'utf8')
    const manifestData = JSON.parse(manifest)
    manifestData.version = newVersion
    fs.writeFileSync(`browsers/${browser}/manifest.json`, JSON.stringify(manifestData, null, 4))
}
