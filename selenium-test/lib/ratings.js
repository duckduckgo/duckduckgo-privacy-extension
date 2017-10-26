const fs = require('fs');
const {Builder, By, until, promise} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const chalk = require('chalk');
const log = console.log;
const tabular = require('tabular-json');
const opn = require ('opn');
const fileUrl = require('file-url');

require('runtimer');

// VARS
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

    WD = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments("load-extension=" + process.cwd()))
    .build();

    log(chalk.green.bold(`Requesting: ${EXTENSIONS_URL}`));
    await WD.get(EXTENSIONS_URL);
    let optionsLink = await WD.wait(until.elementLocated(By.linkText('Options')), 4000);
    let href = await optionsLink.getAttribute('href');
    EXT_ID = href.replace('chrome-extension://', '').replace('/html/options.html', '');
    log(chalk.green(`Found Extension ID: ${EXT_ID}`));
    TEST_URL = `chrome-extension://${EXT_ID}/test/html/screenshots.html`
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
    const filename = new Date().toJSON();
    const jsonData = JSON.parse(jsonText);
    const path = opts.output.replace(/\/$/, '');

    // JSON File Output
    const jsonFile = `${path}/${filename}.json`;
    fs.writeFileSync(jsonFile, jsonText);
    log(chalk.yellow('JSON Data written to file: ') + chalk.yellow.bold(jsonFile));

    // Cleanup data for HTML table
    Object.keys(jsonData).forEach(function (key) {
        delete jsonData[key].scoreObj.specialPage;
        delete jsonData[key].scoreObj.domain;
        Object.keys(jsonData[key].scoreObj).forEach(function (k) {
            jsonData[key][k] = jsonData[key].scoreObj[k];
        });
        delete jsonData[key].scoreObj;

        if (Object.keys(jsonData[key].tosdr).length && jsonData[key].tosdr.reasons){
            const reasons = jsonData[key].tosdr.reasons;

            if (reasons.bad) {
                reasons.bad = reasons.bad.join(', ');
            }
            if (reasons.good) {
                reasons.good = reasons.good.join(', ');
            }
        }
    });

    // HTML File Output
    const htmlTable = tabular.html(jsonData, {classes: {table: "dataTable display"} });
    const htmlDoc = _buildHtmlDoc(htmlTable);
    const htmlFile = `${path}/${filename}.html`;
    fs.writeFileSync(htmlFile, htmlDoc);
    log(chalk.yellow('HTML Table written to file: ') + chalk.yellow.bold(htmlFile));

    // Open file
    opn(fileUrl(htmlFile), { wait: false });
}


// EXPORTS
exports.testTopSites = async function(num, opts) {
    return new Promise (async (resolve, reject) => {
        await _init();
        const url = `${TEST_URL}?numberToTest=${num}&json=true`;
        log(chalk.green.bold(`Running ${num} Tests on Alex Top 500 Sites`));

        const jsonText = await _testUrl(url);
        log(chalk.underline('JSON Data:'));
        log(jsonText);

        // TODO: Audit Data
        // check for:
        //  - before == after
        //  - after < before
        //  Report issues

        _writeToFile(jsonText, opts);

        await _teardown();
        resolve();
    });
};

exports.testUrl = function(path, opts) {
    return new Promise (async (resolve, reject) => {
        await _init();
        const url = `${TEST_URL}?url=${encodeURIComponent(path)}&json=true`;
        log(chalk.green.bold(`Running Tests on URL: ${url}`));

        let jsonText = await _testUrl(url);
        log(chalk.underline('JSON Data:'));
        log(jsonText);

        _writeToFile(jsonText, opts);

        await _teardown();
        resolve();
    });
};

exports.testUrls = async function(urlArray, opts) {
    return new Promise (async (resolve, reject) => {
        await _init();
        let jsonArray = [];

        // for loop forces synchronous execution
        for (let path of urlArray) {
            if (path == '') continue;
            const url = `${TEST_URL}?url=${encodeURIComponent(path)}&json=true`;
            log(chalk.green.bold(`Running Test on URL: ${url}`));
            const jsonText = await _testUrl(url);
            log( jsonText );
            const jsonData = JSON.parse(jsonText);
            jsonArray.push(jsonData[0]);
        }

        log(chalk.underline('JSON Data:'));
        const jsonText = JSON.stringify(jsonArray);
        log(jsonText);

        _writeToFile(jsonText, opts);

        await _teardown();
        resolve();
    });
}

// Take screenshot of results page. Save to disk.
// WD.takeScreenshot().then(base64png => {
//     fs.writeFileSync('screenshots/screenshot.png', new Buffer(base64png, 'base64'));
// });
