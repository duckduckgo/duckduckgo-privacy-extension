var chrome = require('selenium-webdriver/chrome');
var webdriver = require('selenium-webdriver');

var BASE_URL = 'chrome-extension://cjkpfdbancffifiponpcgmapihcohejj/html/';
var MORE_OPTIONS_URL = BASE_URL + 'options.html';
var POPUP_URL = BASE_URL + 'popup.html';
var BACKGROUND_URL = BASE_URL + 'background.html';


var options = new chrome.Options().addExtensions('../build/chrome-zeroclick-latest.crx');

var wd = new webdriver.Builder()
	.forBrowser('chrome')
	.setChromeOptions(options)
	.build();


wd.get(POPUP_URL);
var checks = wd.findElements({id:'search_form_input_homepage'})
	.then(found => console.log('Searchbar exists: %s', !!found.length));
