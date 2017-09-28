const fs = require('fs');
const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const chalk = require('chalk');
const log = console.log;
require('runtimer');

// VARS
const EXTENSIONS_URL = 'chrome://extensions';

let _ext_id,
    _driver,
    _initialized = false;

// PRIVATE
function _init () {
    if (_initialized) {
        return;
    }

    _driver = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments("load-extension=" + process.cwd()))
    .build();

    log(chalk.green.bold(`Requesting: ${EXTENSIONS_URL}`));
    _driver.get(EXTENSIONS_URL);
    return _driver.wait(until.elementLocated(By.linkText('Options')), 4000).then(optionsLink => {
        optionsLink.getAttribute('href').then(href => {
            _ext_id = href.replace('chrome-extension://', '').replace('/html/options.html', '');
            log(chalk.blue(`Found Extension ID: ${_ext_id}`));
            _initialized = true;
        });
    });
};

function _testUrl(_path) {
    _driver.get(_path);
    _driver.wait(until.elementLocated(By.id('json-data'))).then(jsonData => {
        log(chalk.underline('JSON Data:'));
        jsonData.getText().then(jsonText => {
            log(jsonText);
            let filename = new Date().toJSON();
            fs.writeFileSync(`${filename}.json`, jsonText);
            log(chalk.blue('JSON Data written to file:') + chalk.blue.bold(`${filename}.json`));
        });
    });
}


// EXPORTS
exports.testTopSites = async function(num) {
    await _init();
    let TEST_URL = `chrome-extension://${_ext_id}/test/html/screenshots.html?numberToTest=${num}&json=true`;
    log(chalk.green.bold('Running Tests...'));
    await _testUrl(TEST_URL);
    _driver.quit()
};

exports.testUrl = async function(path) {
    await _init();
    let TEST_URL = `chrome-extension://${_ext_id}/test/html/screenshots.html?url=${path}&json=true`;

    log(chalk.green.bold('Running Tests...'));

};

exports.testUrls = (array) => {

}

// Take screenshot of results page. Save to disk.
// _driver.takeScreenshot().then(base64png => {
//     fs.writeFileSync('screenshots/screenshot.png', new Buffer(base64png, 'base64'));
// });