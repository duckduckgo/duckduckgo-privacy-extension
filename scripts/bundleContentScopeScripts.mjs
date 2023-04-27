import fs from 'fs'
const [targetPath, sourcePath, trackerLookupPath, configPath] = process.argv.slice(2)
const utf8 = { encoding: 'utf-8' };

const source = fs.readFileSync(sourcePath, utf8)
const trackerLookup = fs.readFileSync(trackerLookupPath, utf8)
const config = JSON.parse(fs.readFileSync(configPath, utf8))
config.features = {
    navigatorInterface: config.features.navigatorInterface,
    cookie: config.features.cookie,
    adClickAttribution: config.features.adClickAttribution
}
fs.writeFileSync(targetPath, source.replace('$TRACKER_LOOKUP$', trackerLookup).replace('$BUNDLED_CONFIG$', JSON.stringify(config)), utf8)
