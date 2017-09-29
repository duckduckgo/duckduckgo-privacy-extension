const fs = require('fs');
const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const chalk = require('chalk');
const log = console.log;
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
exports.testTopSites = async function(num) {
    await _init();
    let url = `${TEST_URL}?numberToTest=${num}&json=true`;

    log(chalk.green.bold('Running Tests...'));
    var jsonText = await _testUrl(url);

    log(chalk.underline('JSON Data:'));
    log(jsonText);

    let filename = new Date().toJSON();
    fs.writeFileSync(`${filename}.json`, jsonText);
    log(chalk.yellow('JSON Data written to file: ') + chalk.yellow.bold(`${filename}.json`));

    await _teardown();
};

exports.testUrl = async function(path) {
    await _init();
    let url = `${TEST_URL}?url=${encodeURIComponent(path)}&json=true`;
    log(chalk.green.bold(`Running Tests on URL: ${url}`));

    var jsonText = await _testUrl(url);
    log(chalk.underline('JSON Data:'));
    log(jsonText);

    let filename = new Date().toJSON();
    fs.writeFileSync(`${filename}.json`, jsonText);
    log(chalk.yellow('JSON Data written to file: ') + chalk.yellow.bold(`${filename}.json`));

    await _teardown();
};

exports.testUrls = async function(urlArray) {
    await _init();
    var jsonArray = [];

    // for loop forces synchronous execution
    for (let path of urlArray) {
        if (path == '') continue;
        let url = `${TEST_URL}?url=${encodeURIComponent(path)}&json=true`;
        log(chalk.green.bold(`Running Tests on URL: ${url}`));
        let jsonText = await _testUrl(url);
        log( jsonText );
        let jsonData = JSON.parse(jsonText);
        log( jsonData );
        log( jsonData[0] );
        jsonArray.push(jsonData[0]);
    }

    log(chalk.underline('JSON Data:'));
    let jsonText = JSON.stringify(jsonArray);
    log(jsonText);

    let filename = new Date().toJSON();
    fs.writeFileSync(`${filename}.json`, jsonText);
    log(chalk.yellow('JSON Data written to file: ') + chalk.yellow.bold(`${filename}.json`));

    await _teardown();
}

// Take screenshot of results page. Save to disk.
// WD.takeScreenshot().then(base64png => {
//     fs.writeFileSync('screenshots/screenshot.png', new Buffer(base64png, 'base64'));
// });
