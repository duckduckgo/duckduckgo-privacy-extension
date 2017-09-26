const fs = require('fs');
const webdriver = require('selenium-webdriver');
const By = webdriver.By;
const until = webdriver.until;
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');

const EXT_PATH = '../build/chrome-zeroclick-latest.crx',
    BASE_URL = 'chrome-extension://ifojdgcpkiaobdlcoalkcahfjfkhjnhm/html/';

const chromeCapabilities = webdriver.Capabilities.chrome();
chromeCapabilities.set('chromeOptions', {args: ['--headless']});

const options =  new chrome.Options().addExtensions(EXT_PATH);

const driver = new webdriver.Builder()
  .forBrowser('chrome')
  // .setChromeOptions(options)
  .withCapabilities(chromeCapabilities)
  .build();

// Navigate to google.com, enter a search.
driver.get('https://www.duckduckgo.com/');
driver.findElement(By.name('q')).sendKeys('webdriver');
driver.findElement(By.id('search_button_homepage')).click();
driver.wait(until.titleIs('webdriver at DuckDuckGo'), 1000);

// Take screenshot of results page. Save to disk.
driver.takeScreenshot().then(base64png => {
  fs.writeFileSync('screenshot.png', new Buffer(base64png, 'base64'));
});

driver.quit();
