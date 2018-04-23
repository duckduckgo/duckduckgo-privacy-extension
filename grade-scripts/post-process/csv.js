const fs = require('fs');
const log = console.log;
const chalk = require('chalk');
const name = process.argv[2];
const csvHeaders = 'domain,requests,initial,is major,tosdr,in major,https,obscure,blocked,total,grade\n'
const csvPath  = `${name}.csv`;
const histPath = `${name}.hist.csv`;
const inputPath = `${process.cwd()}/${name}-grades/`;

let hist = new Array(100)

const appendLine = (fn,text) => {
    try {
        fs.appendFileSync(fn, text)
    }
    catch (err) {
        console.log(chalk.red(`error writing to ${fn}`))
    }
}

function _getDetailsData (jsonText) {
    let siteData = JSON.parse(jsonText);

    let detailsData = siteData.map((site) => ({
        url: site.url,
        details: site.decisions
    }));

    return JSON.stringify(detailsData, null, "  ");
}


let csvDetails = (details) => {
    let cols = ''
    const col = (s) => { return `${s},` }

    // assuming that the data is in column header order
    // that is the order it is in the algorithm
    // if that changes, we need to change this, will have to order by d.why
    details.forEach( (d) => {

        // for the final one we'll add the final grade as another column
        if (d.why.match(/final grade/)) {
            cols += col(d.index)
            if (!hist[d.index])
                hist[d.index] = 0
            hist[d.index] += 1;
            cols += d.grade
        }
        else {
            cols += col(d.change)
        }
    })
    return cols;
};

let csvSimple = (simpleArray) => {
    let cols = ''
    simpleArray.forEach( (el) => {
        cols += `${el},`
    })

    if (cols.length > 1)
        return cols.substring(0, cols.length - 1);

    return ''
};

let getCSVData = (fileName) => {
    let siteName = fileName.replace(/\.json$/, '');
    let jsonText = fs.readFileSync(inputPath + fileName, 'utf8');

    let site = JSON.parse(jsonText);

    if (!site.url || !site.decisions) {
        console.log(chalk.red(`error: missing site url or details for ${fileName}`));
        return;
    }

    let csvtext = `${siteName},${site.totalBlocked},${csvDetails(site.decisions)}`
    console.log(csvtext)
    appendLine(csvPath, `${csvtext}\n`)
};

// nullify results from previous runs
try {
    fs.unlinkSync(csvPath);
} catch(e) {
    // ah well
}

// add the headings for the CSV
appendLine(csvPath, `${csvHeaders}\n`)

const files = fs.readdirSync(inputPath);

files.forEach(getCSVData);

// write histogram
let hist_text = 'score,total\n'

hist.forEach( (x, i) => {
    hist_text += `${i},${x}\n`
})

fs.writeFileSync(histPath, hist_text, 'utf8');
