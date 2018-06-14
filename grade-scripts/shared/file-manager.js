/**
 * Contains shared functionality for saving/opening site data files
 */

const fs = require('fs')

const getSiteData = (inputPath, outputPath, fileForSubset, skipExistingFiles) => {
    // get initial file data
    let siteDataFiles = fs.readdirSync(inputPath)

    // if we've defined a file for subset, get all the sites listed in that
    // and avoid processing all the rest
    if (fileForSubset) {
        let sitesForSubset = fs.readFileSync(fileForSubset, { encoding: 'utf8' })
            .trim()
            .split('\n')

        siteDataFiles = siteDataFiles.filter((fileName) => {
            let hostname = fileName.replace(/\.json$/, '')
            return sitesForSubset.indexOf(hostname) > -1
        })
    }

    // skip files that exist
    if (skipExistingFiles && outputPath) {
        siteDataFiles = siteDataFiles.filter((fileName) => {
            let destPath = `${outputPath}/${fileName}`
            let hostname = fileName.replace(/\.json$/, '')
            let fileExists

            try {
                fileExists = fs.existsSync(destPath)
            } catch (e) {
                // ¯\_(ツ)_/¯
            }

            if (fileExists) {
                console.log(`grade file exists for ${hostname}, skipping`)
                return false
            }

            return true
        })
    }

    let siteData = siteDataFiles.map(fileName => require(`${process.cwd()}/${inputPath}/${fileName}`))

    // don't process files that failed in the previous step
    siteData = siteData.filter(data => !siteData.failed)

    return siteData
}

module.exports = {
    getSiteData
}
