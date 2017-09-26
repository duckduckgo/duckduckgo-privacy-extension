const fs = require('fs');
const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');

const EXT_PATH = '../build/chrome-zeroclick-latest.crx',
    BASE_URL = 'chrome-extension://ifojdgcpkiaobdlcoalkcahfjfkhjnhm/';

// const chromeCapabilities = webdriver.Capabilities.chrome();
// chromeCapabilities.set('chromeOptions', {args: ['--headless']});

const driver = new Builder()
  .forBrowser('chrome')
  .setChromeOptions(new chrome.Options().addArguments("load-extension=./"))
  .build();

const numPages = 2;
const url = `${BASE_URL}/test/html/screenshots.html?numberToTest=${numPages}&json=true`;

console.log(url);

// Navigate to google.com, enter a search.
driver.get(url);
driver.wait(until.elementLocated(By.id('screenshots')));

// Take screenshot of results page. Save to disk.
driver.takeScreenshot().then(base64png => {
  fs.writeFileSync('screenshot.png', new Buffer(base64png, 'base64'));
});

// driver.quit();
