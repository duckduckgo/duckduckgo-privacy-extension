const fs = require('fs');
const childProcess = require('child_process');
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

exports.testUrls = async function(urlArray, opts) {
    return new Promise (async (resolve, reject) => {
        // create output dir if it didn't exist already
        let outputDir = `${process.cwd()}/${opts.output}-sites/`;
        childProcess.execSync(`mkdir -p ${outputDir}`);

        await _init();
        let jsonArray = [];

        console.log(`Testing with ${TEST_URL}`)

        // for loop forces synchronous execution
        for (let path of urlArray) {
            if (path == '') continue;

            let filePath = `${outputDir}/${path}.json`;
            let fileExists;

            try {
                fs.accessSync(filePath);
                fileExists = true;
            } catch (e) {
                fileExists = false;
            }

            if (fileExists) {
                console.log(`File exists for ${path}, skipping`);
                continue;
            }

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

            // the JSON we get back from the test page is wrapped in an array
            // so unwrap it
            let jsonObj = JSON.parse(jsonText);
            let noArrayJson = JSON.stringify(jsonObj[0]);

            fs.writeFileSync(filePath, noArrayJson, 'utf8');
        }


        await _teardown();
        resolve();
    });
}

// Take screenshot of results page. Save to disk.
// WD.takeScreenshot().then(base64png => {
//     fs.writeFileSync('screenshots/screenshot.png', new Buffer(base64png, 'base64'));
// });
