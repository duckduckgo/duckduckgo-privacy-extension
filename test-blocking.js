const fs = require('fs')
global.tldjs = require('tldjs')
const Trackers = require('@duckduckgo/privacy-grade').Trackers
global.utils = require('./utils-test-blocking.es6')
const tds = require('./tds.json')
const surrogates = ''
const program = require('commander')
const csv = require('csv-parser')
const chalk = require('chalk')

const headers = ['tracker', 'site', 'action']

program
    .usage('node test-blocking.js --file [path to csv blocking results to compare]')
    .option('--in [csv]', 'csv file to request to test')
    .parse(process.argv)

if (!program.in) {
    throw new Error('need csv file to test, opton --in')
}

global.tdsStorage = {
    tds,
    surrogates: ''
}

const trackers = new Trackers({tldjs, utils})
trackers.setLists([
    { name: 'tds', data: {entities: tds.entities, trackers: tds.trackers, domains: tds.domains}}, 
    { name: 'surrogates', data: surrogates }
])

let errors = 0

fs.createReadStream(program.in)
    .pipe(csv({headers}))
    .on('data', (row) => {
        cmp_blocking(row)
    })
    .on('end', () => {
        if (errors) {
            console.log(`There were ${chalk.red(errors)} incorrect blocking tests`)
        } else {
            console.log('No incorrect blocking tests 👍')
        }
        console.log(chalk.green('DONE'))
    })

function cmp_blocking (req) {
    const result = trackers.getTrackerData(req.tracker, req.site,{type: 'script'})
    if (result && result.action !== req.action) {
        errors += 1
        console.log(result)
        console.log(req)
    }
}
