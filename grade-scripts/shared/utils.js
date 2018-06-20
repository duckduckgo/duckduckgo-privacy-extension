const fs = require('fs')

const responseIsOK = (response, siteToCheck) => {
    // we only care about main frame responses for the site we're opening
    if (response.request().resourceType() !== 'document' ||
            !response.url().match(new RegExp(`^https?://${siteToCheck}`))) {
        return true
    }

    let status = response.status()
    let firstStatusDigit = Math.floor(status / 100)

    return firstStatusDigit === 1 ||
        firstStatusDigit === 2 ||
        firstStatusDigit === 3
}

const getSiteData = (inputPath, fileForSubset) => {
    // get initial file data
    let siteDataFiles = fs.readdirSync(inputPath)

    // if we've defined a file for subset, get all the sites listed in that
    // and avoid processing all the rest
    if (fileForSubset) {
        let sitesForSubset = fs.readFileSync(fileForSubset, { encoding: 'utf8' })
            .trim()
            .split('\n')

        // we map from the sitesForSubset array because we want
        // to preserve the order defined in that file
        siteDataFiles = sitesForSubset
            .map(hostname => hostname + '.json')
            .filter((fileName) => {
                return siteDataFiles.indexOf(fileName) > -1
            })
    }

    let siteData = siteDataFiles.map(fileName => require(`${process.cwd()}/${inputPath}/${fileName}`))

    // don't process files that failed in the previous step
    siteData = siteData.filter(data => !siteData.failed)

    return siteData
}

const dataFileExists = (hostname, outputPath) => {
    let destPath = `${outputPath}/${hostname}.json`
    let fileExists

    try {
        fileExists = fs.existsSync(destPath)
    } catch (e) {
        // ¯\_(ツ)_/¯
    }

    if (fileExists) {
        console.log(`file exists for ${hostname}, skipping`)
    }

    return fileExists
}

module.exports = {
    responseIsOK,
    getSiteData,
    dataFileExists
}
