/** creates surrogates.txt file that contains names of all available surrogates files in a legacy format */
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { exit } = require('yargs')
const fs = require('fs')
const argv = yargs(hideBin(process.argv)).argv

if (!fs.existsSync(argv.i)) {
    console.error('Input folder (-i) must exist.')
    exit(1)
}

const files = fs.readdirSync(argv.i)

if (argv.json) {
    console.log(JSON.stringify(files, null, 2))
} else {
    // Legacy format used by the extension at runtime.
    files.forEach((file) => {
        console.log(`domain.com/${file} application/javascript\n`)
    })
}
