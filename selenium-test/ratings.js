const fs = require('fs');
const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');

const EXT_PATH = '../build/chrome-zeroclick-latest.crx',
      EXTENSIONS_URL = 'chrome://extensions';

const driver = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments("load-extension=./"))
    .build();

const numPages = 2;
var EXT_ID;

console.log(`Requesting: ${EXTENSIONS_URL}`);
driver.get(EXTENSIONS_URL);
driver.wait(until.elementLocated(By.linkText('Options')), 4000).then(optionsLink => {

    optionsLink.getAttribute('href').then(href => {
        EXT_ID = href.replace('chrome-extension://', '').replace('/html/options.html', '');
        console.log(`Found Extension ID: ${EXT_ID}`);

        const TEST_URL = `chrome-extension://${EXT_ID}/test/html/screenshots.html?numberToTest=${numPages}&json=true`;

        console.log(`Running Tests...`);
        driver.get(TEST_URL);
        driver.wait(until.elementLocated(By.id('json-data'))).then(jsonData => {
            console.log(`JSON Data:`);
            jsonData.getText().then(text => {
                console.log(text);
                fs.writeFileSync('test-result.json', text);
                console.log(`JSON Data written to file: test-result.json`);
            });
        });

        // Take screenshot of results page. Save to disk.
        // driver.takeScreenshot().then(base64png => {
        //     fs.writeFileSync('screenshots/screenshot.png', new Buffer(base64png, 'base64'));
        // });
    });
});

driver.quit();
