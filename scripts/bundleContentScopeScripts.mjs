import fs from 'fs/promises'
const [targetPath, sourcePath, trackerLookupPath, configPath] = process.argv.slice(2)
const utf8 = { encoding: 'utf-8' };

(async () => {
    const source = await fs.readFile(sourcePath, utf8)
    const trackerLookup = await fs.readFile(trackerLookupPath, utf8)
    const config = JSON.parse(await fs.readFile(configPath, utf8))
    config.features = {
        cookie: config.features.cookie
    }
    await fs.writeFile(targetPath, source.replace('$TRACKER_LOOKUP$', trackerLookup).replace('$BUNDLED_CONFIG$', JSON.stringify(config)), utf8)
})()
