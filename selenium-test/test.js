var chrome = require('selenium-webdriver/chrome');
var webdriver = require('selenium-webdriver');
var assert = require('selenium-webdriver/testing/assert');
var input = require('selenium-webdriver/lib/input');
var by = require('selenium-webdriver/lib/by');

var EXT_PATH = '../build/chrome-zeroclick-latest.crx';

var BASE_URL = 'chrome-extension://cjkpfdbancffifiponpcgmapihcohejj/html/';
var MORE_OPTIONS_URL = BASE_URL + 'options.html';
var POPUP_URL = BASE_URL + 'popup.html';
var BACKGROUND_URL = BASE_URL + 'background.html';


var options = new chrome.Options().addExtensions(EXT_PATH);

var wd = new webdriver.Builder()
	.forBrowser('chrome')
	.setChromeOptions(options)
	.build();


wd.get(POPUP_URL);

// Test searchbar in the popup modal
var searchbar = wd.findElement({id:'search_form_input_homepage'});
var exists = new assert.Assertion(searchbar.isDisplayed(), 'Searchbar exists and is displayed');

wd.sleep(500);

var searchbar_text = searchbar.getText()
	.then(function(text){ return text; });
var equal_text = new assert.Assertion(searchbar_text).equals('', 'Searchbar is empty');

wd.sleep(500);

// Test bangs
var amazon_bang = wd.findElement({id:'bang_a'});

wd.actions()
	.click(amazon_bang)
	.perform();

wd.sleep(500);

searchbar = wd.findElement({id:'search_form_input_homepage'});
searchbar_text = searchbar.getAttribute('value')
	.then(function(text){ return text; });
equal_text = new assert.Assertion(searchbar_text).equals('!a ', 'Searchbar contains amazon bang');

wd.sleep(500);

searchbar.sendKeys('xbox 360');
var search_btn = wd.findElement({id:'search_button_homepage'});

wd.actions()
	.click(search_btn)
	.perform();

wd.sleep(500);

// Switch to new tab
wd.getAllWindowHandles().then(function(tabs){ 
	//console.log(tabs); 
	new assert.Assertion(tabs.length).equals(2, 'New tab opened ' + tabs);
	wd.switchTo().window(tabs[1]);
	wd.sleep(500);
	testBangUrl(wd, /www\.amazon\.com/);
});

// Test whether searching using a bang redirects to the correct site
function testBangUrl(newtab, bang_regex) {
var url = newtab.getCurrentUrl()
	.then(function(url){ return url; });
wd.sleep(500);
var equal_url = new assert.Assertion(url).matches(bang_regex, 'Amazon bang search redirected to the correct site');
}
