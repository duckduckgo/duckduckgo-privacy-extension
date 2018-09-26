const scriptUtils = require('../shared/utils')
const program = require('commander')
const listManager = require('../shared/list-manager')
const fs = require('fs')

program
    .option('-i, --input <name>', 'The name to use when looking for trackers to calculate prevalence from, e.g. "test" will look in "test-trackers" (required)')
    .parse(process.argv)

const input = program.input
const inputPath = `${input}-trackers`

const run = async () => {
    await listManager.loadLists()

    // get all the tracker files to calculate prevalence from
    let siteDataArray = scriptUtils.getSiteData(inputPath)
    let entityList = listManager.getList('entityList')
    let networkPrevalence = {}

    let networksSeen = {}

    // count up all the tracker networks seen on each site
    siteDataArray.forEach((siteData) => {
        let networksOnThisSite = {}

        // get all the tracker networks seen on a specific site
        Object.keys(siteData.trackersBlocked).forEach((network) => {
            Object.keys(siteData.trackersBlocked[network]).forEach((trackerUrl) => {
                let parent = entityList[trackerUrl] || network
                networksOnThisSite[parent] = true
            })
        })
        Object.keys(siteData.trackersNotBlocked).forEach((network) => {
            Object.keys(siteData.trackersNotBlocked[network]).forEach((trackerUrl) => {
                let parent = entityList[trackerUrl] || network
                networksOnThisSite[parent] = true
            })
        })

        // add them to the global counts
        Object.keys(networksOnThisSite).forEach((network) => {
            if (network === 'unknown') return

            if (!networksSeen[network]) {
                networksSeen[network] = 0
            }

            networksSeen[network] += 1
        })
    })

    // calculate overall prevalence
    let totalSites = siteDataArray.length

    Object.keys(networksSeen).forEach((network) => {
        let percent = networksSeen[network] / totalSites * 100
        // round to 2 significant digits
        percent = Math.round(percent * 100) / 100

        networkPrevalence[network] = percent
    })

    // write the prevalence to file, then add it to all the file data
    fs.writeFileSync(`${__dirname}/../../data/generated/prevalence.json`, JSON.stringify(networkPrevalence))
}

run()
