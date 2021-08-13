const fs = require('fs')
const time = new Date();

const seconds = (time.getUTCHours() * 60 * 60) + (time.getUTCMinutes() * 60) + time.getUTCSeconds();
const newVersion = `${time.getUTCFullYear()}.${time.getUTCMonth()+1}.${time.getUTCDate()}-${seconds}`

for (let browser of ['chrome', 'firefox']) {
    const manifest = fs.readFileSync(`browsers/${browser}/manifest.json`, 'utf8')
    const manifestData = JSON.parse(manifest);
    manifestData.version = newVersion;
    fs.writeFileSync(
        `browsers/${browser}/manifest.json`,
        JSON.stringify(manifestData, null, 4),
    )
}
