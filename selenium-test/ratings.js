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

driver.get(EXTENSIONS_URL);
console.log(`Requesting: ${EXTENSIONS_URL}`);
driver.wait(until.elementLocated(By.className('options-link'), 'Options button should exist'), 4000).then(optionsLink => {
    driver.findElement(By.className('options-link')).click();
    driver.wait(until.titleIs('DuckDuckGo Options'), 1000);
    const url = driver.getCurrentUrl().then(value => {
        console.log(value);
    });
});

const EXT_ID = 'jkedpfmglkofeglhlegkmoagmiapgdab',
    BASE_URL = `chrome-extension://${EXT_ID}`,
    TEST_URL = `${BASE_URL}/test/html/screenshots.html?numberToTest=${numPages}&json=true`;

driver.wait(until.elementLocated(By.id('screenshots')));

// Take screenshot of results page. Save to disk.
// driver.takeScreenshot().then(base64png => {
//     fs.writeFileSync('screenshots/screenshot.png', new Buffer(base64png, 'base64'));
// });

driver.quit();
