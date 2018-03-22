const fs = require('fs');
const {Builder, By, until, promise} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const chalk = require('chalk');
const log = console.log;
// const tabular = require('tabular-json');
const opn = require ('opn');
const fileUrl = require('file-url');

require('runtimer');

const EXTENSIONS_URL = 'chrome://extensions';

let EXT_ID,
    TEST_URL,
    WD,
    INITIALIZED = false;

// REMOVE LATER
// See https://github.com/SeleniumHQ/selenium/wiki/WebDriverJs#moving-to-asyncawait
promise.USE_PROMISE_MANAGER = false;

// PRIVATE
async function _init () {
    if (INITIALIZED) return;

    // https://seleniumhq.github.io/selenium/docs/api/javascript/
    // https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_Builder.html
    WD = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments("load-extension=" + process.cwd() + "/build/chrome/dev"))
    .build();

    log(chalk.green.bold(`Requesting: ${EXTENSIONS_URL}`));
    await WD.get(EXTENSIONS_URL);

    let optionsLink = await WD.wait(until.elementLocated(By.linkText('Options')), 4000);
    let href = await optionsLink.getAttribute('href');

    EXT_ID = href.replace('chrome-extension://', '').replace('/html/options.html', '');
    log(chalk.green(`Found Extension ID: ${EXT_ID}`));

    // TEST_URL = `chrome-extension://${EXT_ID}/test/html/screenshots.html`
    TEST_URL = `chrome-extension://${EXT_ID}/test/html/grade.html`

    INITIALIZED = true;
};

async function _testUrl(_path) {
    await WD.get(_path);
    let jsonData = await WD.wait(until.elementLocated(By.id('json-data')));
    return jsonData.getText();
}

function _teardown () {
    return WD.quit();
}

// TODO:
// Stash datatables js/css in repo?
function _buildHtmlDoc(htmlTable) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/v/dt/dt-1.10.16/datatables.min.css" />
        <script type="text/javascript" src="https://cdn.datatables.net/v/dt/jq-3.2.1/dt-1.10.16/datatables.min.js"></script>
        <style type='text/css'>
            * {
                font-family: sans-serif
            }
        </style>
    </head>
    <body>
        ${htmlTable}
        <script type="application/javascript">
            $(document).ready(function() {
                $('table').DataTable()
            });
        </script>
    </body>
    </html>
    `;
}


function _writeToFile (jsonText, opts) {
    const jsonFile = `${opts.output}.json`
    fs.writeFileSync(jsonFile, jsonText)

    log(`JSON Data written to ${jsonFile}`)
}

function _getDetailsData (jsonText) {
    let siteData = JSON.parse(jsonText);

    let detailsData = siteData.map((site) => ({
        url: site.url,
        details: site.scoreObj.decisions
    }));

    return JSON.stringify(detailsData, null, "  ");
}


exports.testUrl = function(path, opts) {
    return new Promise (async (resolve, reject) => {
        await _init();
        const url = `${TEST_URL}?url=${encodeURIComponent(path)}&json=true`;
        log(chalk.green.bold(`Running Tests on URL: ${url}`));

        let jsonText = await _testUrl(url);
        const detailsText = _getDetailsData(jsonText);


        log(chalk.underline('JSON Data:'));
        log(detailsText);

        _writeToFile(detailsText, opts);

        await _teardown();
        resolve();
    });
};

let hist = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
let csvHeaders = 'rank,domain,requests,initial,is major,tosdr,in major,https,obscure,blocked,total,grade\n'
// let csvHeaders = 'rank,domain,hasHTTPS,is major network,total blocked,obscure,in major,tosdr,initial,in major,tosdr,in major,https,obscure,blocked,total,grade\n'

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
            hist[d.index] += 1;
            cols += d.grade
        }
        else {
            cols += col(d.change)
        }
    })
    return cols;
}

let csvSimple = (simpleArray) => {
    let cols = ''
    simpleArray.forEach( (el) => {
        cols += `${el},`
    })

    if (cols.length > 1)
        return cols.substring(0, cols.length - 1);

    return ''
}

const appendLine = (fn,text) => {
    try {
        // fs.appendFileSync(jsonFile, `${JSON.stringify(o)}\n`)
        fs.appendFileSync(fn, text)
    }
    catch (err) {
        console.log(chalk.red(`error writing to ${fn}`))
    }
}

exports.testUrls = async function(urlArray, opts) {
    return new Promise (async (resolve, reject) => {
        await _init();
        let jsonArray = [];

        const jsonPath = `${opts.output}.json`
        const csvPath  = `${opts.output}.csv`
        const histPath = `${opts.output}.hist.csv`

        console.log(`Testing with ${TEST_URL}`)
        console.log(`writing intermediate results to ${csvPath}`)

        appendLine(csvPath, csvHeaders)

        let rank = 0

        // for loop forces synchronous execution
        for (let path of urlArray) {
            if (path == '') continue;

            rank++

            if (path.indexOf('http://') === -1) {
                path = 'http://' + path;
            }

            const url = `${TEST_URL}?url=${encodeURIComponent(path)}&json=true`;
            log(chalk.green(url));

            const jsonText = await _testUrl(url);

            if (!jsonText) {
                log(chalk.red(`Failed to receive json data for '${path}'`))
                continue
            }
            
            const jsonData = JSON.parse(jsonText);


            if (jsonData && jsonData[0]) {
                let site = jsonData[0];

                if (site.url && site.scoreObj && site.scoreObj.decisions) {

                    let score = site.scoreObj


                    let scoreArray = [
                            score.hasHTTPS ? 1 : 0,
                            score.isaMajorTrackingNetwork ? 1 : 0,
                            score.totalBlocked,
                            score.hasObscureTracker ? 1 : 0,
                            score.inMajorTrackingNetwork? 1 : 0,
                            (score.tosdr && score.tosdr.score) ? score.tosdr.score : '-'
                        ]

                    // let csvtext = `${rank},${path},${csvSimple(scoreArray)},${csvDetails(site.scoreObj.decisions)}`
                    let csvtext = `${rank},${path},${score.totalBlocked},${csvDetails(site.scoreObj.decisions)}`
                    console.log(csvtext)
                    appendLine(csvPath, `${csvtext}\n`)

                    let o = {
                        url: site.url,
                        details: site.scoreObj.decisions,
                        trackers: site.trackers,
                        score: scoreArray
                    }


                    jsonArray.push(o)
                }
                else
                    log(chalk.red(`error: missing site url or details for ${path}`))
            }
            else
                log(chalk.red(`error: missing jsonData for ${path}`))

            // jsonArray.push(jsonData[0]);
        }

        // log(chalk.underline('JSON Data:'));
        // const jsonText = JSON.stringify(jsonArray);

        // const detailsText = _getDetailsData(jsonText);
        // log(detailsText);

        // _writeToFile(detailsText, opts);

        // write histogram
        let hist_text = 'score,total\n'

        hist.forEach( (x, i) => {
            hist_text += `${i},${x}\n`
        })

        fs.writeFile(histPath, hist_text, err => {
            if (err) {
                console.log(`error ${err} for ${histPath}`)
                return
            }
        })

        fs.writeFile(jsonPath, JSON.stringify(jsonArray), err => {
            if (err) {
                console.log(`error ${err} for ${jsonPath}`)
                return
            }
        })

        // _writeToFile(JSON.stringify(jsonArray), opts)

        await _teardown();
        resolve();
    });
}

// Take screenshot of results page. Save to disk.
// WD.takeScreenshot().then(base64png => {
//     fs.writeFileSync('screenshots/screenshot.png', new Buffer(base64png, 'base64'));
// });
