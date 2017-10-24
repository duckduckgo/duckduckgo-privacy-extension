const fs = require('fs');
const {Builder, By, until, promise} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const chalk = require('chalk');
const log = console.log;
const tabular = require('tabular-json');

require('runtimer');

// VARS
const EXTENSIONS_URL = 'chrome://extensions';

let EXT_ID,
    TEST_URL,
    WD,
    INITIALIZED = false;

// REMOVE
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

function _flatten(arr) {
    return Array.prototype.concat(...arr);
}

// EXPORTS
exports.testTopSites = async function(num, opts) {
    return new Promise (async (resolve, reject) => {
        await _init();
        let url = `${TEST_URL}?numberToTest=${num}&json=true`;

        log(chalk.green.bold(`Running ${num} Tests on Alex Top 500 Sites`));
        let jsonText = await _testUrl(url);

        log(chalk.underline('JSON Data:'));
        log(jsonText);

        // TODO: Audit Data
        // check for:
        //  - before == after
        //  - after < before
        //  Report issues

        // JSON File Output
        let filename = new Date().toJSON();
        fs.writeFileSync(`${filename}.json`, jsonText);
        log(chalk.yellow('JSON Data written to file: ') + chalk.yellow.bold(`${filename}.json`));

        // HTML File Output
        let htmlTable = tabular.html(JSON.parse(jsonText), {classes: {table: "dataTable display"} });
        let htmlDoc =
        `<!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/v/dt/dt-1.10.16/datatables.min.css"/>
                <script type="text/javascript" src="https://cdn.datatables.net/v/dt/jq-3.2.1/dt-1.10.16/datatables.min.js"></script>
                <style type='text/css'>* { font-family: sans-serif }</style>
            </head>
            <body>
                ${htmlTable}
                <script type="application/javascript">
                    $(document).ready(function(){ $('table').DataTable() });
                </script>
            </body>
        </html>`;

        let path = opts.output.replace(/\/$/, '');
        console.log(`PATH IS: ${path}`);
        fs.writeFileSync(`${path}/${filename}.html`, htmlDoc);
        log(chalk.yellow('HTML Table written to file: ') + chalk.yellow.bold(`${filename}.html`));

        await _teardown();
        resolve();
    });
};

exports.testUrl = function(path, opts) {
    return new Promise (async (resolve, reject) => {
        await _init();
        let url = `${TEST_URL}?url=${encodeURIComponent(path)}&json=true`;
        log(chalk.green.bold(`Running Tests on URL: ${url}`));

        let jsonText = await _testUrl(url);
        log(chalk.underline('JSON Data:'));
        log(jsonText);

        let filename = new Date().toJSON();
        fs.writeFileSync(`${filename}.json`, jsonText);

        log(chalk.yellow('JSON Data written to file: ') + chalk.yellow.bold(`${filename}.json`));

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
            let url = `${TEST_URL}?url=${encodeURIComponent(path)}&json=true`;
            log(chalk.green.bold(`Running Test on URL: ${url}`));
            let jsonText = await _testUrl(url);
            log( jsonText );
            let jsonData = JSON.parse(jsonText);
            jsonArray.push(jsonData[0]);
        }

        log(chalk.underline('JSON Data:'));
        let jsonText = JSON.stringify(jsonArray);
        log(jsonText);

        let filename = new Date().toJSON();
        fs.writeFileSync(`${filename}.json`, jsonText);
        log(chalk.yellow('JSON Data written to file: ') + chalk.yellow.bold(`${filename}.json`));

        await _teardown();
        resolve();
    });
}

// Take screenshot of results page. Save to disk.
// WD.takeScreenshot().then(base64png => {
//     fs.writeFileSync('screenshots/screenshot.png', new Buffer(base64png, 'base64'));
// });
