const fs = require('fs');

const allBrowsers = ['chrome', 'firefox', 'chrome-mv2', 'embedded'];
const newVersion = process.argv[2];
const browserFilter = process.argv[3];

const browsers = browserFilter ? [browserFilter] : allBrowsers;

for (const browser of browsers) {
    const manifest = fs.readFileSync(`browsers/${browser}/manifest.json`, 'utf8');
    const manifestData = JSON.parse(manifest);
    manifestData.version = newVersion;
    fs.writeFileSync(`browsers/${browser}/manifest.json`, JSON.stringify(manifestData, null, 4));
}
