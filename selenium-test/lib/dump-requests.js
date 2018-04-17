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

async function _buildDriver() {
    // https://seleniumhq.github.io/selenium/docs/api/javascript/
    // https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_Builder.html
    WD = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().addArguments("load-extension=" + process.cwd() + "/build/chrome/dev"))
        .build();
}

async function _init () {
    if (INITIALIZED) return;

    await _buildDriver();

    log(chalk.green.bold(`Requesting: ${EXTENSIONS_URL}`));
    await WD.get(EXTENSIONS_URL);

    let optionsLink = await WD.wait(until.elementLocated(By.linkText('Options')), 4000);
    let href = await optionsLink.getAttribute('href');

    EXT_ID = href.replace('chrome-extension://', '').replace('/html/options.html', '');
    log(chalk.green(`Found Extension ID: ${EXT_ID}`));

    TEST_URL = `chrome-extension://${EXT_ID}/test/html/dumpRequests.html`

    INITIALIZED = true;
};

async function _testUrl(_path) {
    await WD.get(_path);
    let jsonData = await WD.wait(until.elementLocated(By.id('json-data')));
    return jsonData.getText();
}

async function _teardown () {
    await WD.quit();
}

async function _rebuild() {
    await _teardown();
    await _buildDriver();
}

exports.getRequests = async function(urlArray, opts) {
    return new Promise (async (resolve, reject) => {
        // create output dir if it didn't exist already
        let outputDir = `${process.cwd()}/sites/`;
        childProcess.execSync(`mkdir -p ${outputDir}`);

        await _init();
        let jsonArray = [];

        console.log(`Testing with ${TEST_URL}`)

        let numSitesChecked = 0;

        for (let path of urlArray) {
            if (path == '') continue;

            // rebuild driver every 100 checks
            if (numSitesChecked > 100) {
                await _rebuild();
                console.log("refreshing driver");
                numSitesChecked = 0;
            }

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

            numSitesChecked++;

            // the JSON we get back from the test page is wrapped in an array
            // so unwrap it
            let jsonObj = JSON.parse(jsonText);
            let noArrayJson = JSON.stringify(jsonObj[0]);

            if (!jsonObj[0].requests || !jsonObj[0].requests.length) {
                log(chalk.red(`Failed to get requests for '${path}'`));
                continue
            }

            fs.writeFileSync(filePath, noArrayJson, 'utf8');

        }


        await _teardown();
        resolve();
    });
}
