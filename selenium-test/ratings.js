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
    WD,
    INITIALIZED = false;


// PRIVATE
function _init () {
    if (INITIALIZED) {
        return;
    }

    WD = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments("load-extension=" + process.cwd()))
    .build();

    log(chalk.green.bold(`Requesting: ${EXTENSIONS_URL}`));
    WD.get(EXTENSIONS_URL);
    return WD.wait(until.elementLocated(By.linkText('Options')), 4000).then(optionsLink => {

        optionsLink.getAttribute('href').then(href => {
            EXT_ID = href.replace('chrome-extension://', '').replace('/html/options.html', '');
            log(chalk.green(`Found Extension ID: ${EXT_ID}`));
            INITIALIZED = true;
        });
    });
};

function _testUrl(_path) {
    WD.get(_path);
    return WD.wait(until.elementLocated(By.id('json-data'))).then(jsonData => {
        log(chalk.underline('JSON Data:'));
        jsonData.getText().then(jsonText => {
            log(jsonText);
            let filename = new Date().toJSON();
            fs.writeFileSync(`${filename}.json`, jsonText);
            log(chalk.yellow('JSON Data written to file: ') + chalk.yellow.bold(`${filename}.json`));
        });
    });
}

function _teardown () {
    WD.quit();
}


// EXPORTS
exports.testTopSites = async function(num) {
    await _init();
    let TEST_URL = `chrome-extension://${EXT_ID}/test/html/screenshots.html?numberToTest=${num}&json=true`;

    log(chalk.green.bold('Running Tests...'));
    await _testUrl(TEST_URL);
    _teardown();
};

exports.testUrl = async function(path) {
    await _init();
    let TEST_URL = `chrome-extension://${EXT_ID}/test/html/screenshots.html?numberToTest=${numPages}&json=true`;

    log(chalk.green.bold('Running Tests...'));

};

exports.testUrls = (array) => {

}

// Take screenshot of results page. Save to disk.
// WD.takeScreenshot().then(base64png => {
//     fs.writeFileSync('screenshots/screenshot.png', new Buffer(base64png, 'base64'));
// });