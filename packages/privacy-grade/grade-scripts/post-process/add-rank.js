// add rank to site data that doesn't already have rank set
const program = require('commander')
const chalk = require('chalk')
const fs = require('fs')

program
    .option('-f, --file <name>', 'Text file with newline-separated hostnames')
    .option('-i, --input <name>', 'Input name, e.g. "test" will add rank to sites at "test-sites"')
    .parse(process.argv)


const fileName = program.file
const input = program.input
const inputPath = `${input}-sites`

let sites

try {
    sites = fs.readFileSync(fileName, { encoding: 'utf8' }).trim().split('\n')
} catch (e) {
    console.log(chalk.red(`Error getting sites from file ${fileName}: ${e.message}`))
    return
}

sites.forEach((site, i) => {
    let filePath = `${inputPath}/${site}.json`

    try {
        let siteData = require(`../../${filePath}`)

        siteData.rank = i

        fs.writeFileSync(filePath, JSON.stringify(siteData))
        console.log(chalk.green(`${site} is now ranked: ${i}`))
    } catch (e) {
        console.log(chalk.red(`couldn't set rank for ${site}: ${e.message}`))
    }
})
