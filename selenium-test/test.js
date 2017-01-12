const {Builder, By, promise, until} = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome'),
    webdriver = require('selenium-webdriver'),
    test = require('selenium-webdriver/testing'),
    assert = require('selenium-webdriver/testing/assert'),
    input = require('selenium-webdriver/lib/input');

var EXT_PATH = '../build/chrome-zeroclick-latest.crx',
    BASE_URL = 'chrome-extension://cjkpfdbancffifiponpcgmapihcohejj/html/',
    MORE_OPTIONS_URL = BASE_URL + 'options.html',
    POPUP_URL = BASE_URL + 'popup.html',
    BACKGROUND_URL = BASE_URL + 'background.html',
    BASE_BANG_ID = 'bang_';

var amazon = {
    name: 'Amazon',
    reg_url: /www\.amazon\..+/,
    text: 'a'
},
    gimages = {
    name: 'Google Images',
    reg_url: /www\.google\..+/,
    text: 'gi'
},
    bimages = {
    name: 'Bing Images',
    reg_url: /www\.bing\.com/,
    text: 'bi'
},
    map = {
    name: 'Map',
    reg_url: /www\.google\..+\/maps\//,
    text: 'm'
},
    news = {
    name: 'News',
    reg_url: /news\.google\.com/,
    text: 'n'
},
   wikipedia = {
   name: 'Wikipedia',
   reg_url: /.+\.wikipedia\.org/,
   text: 'w'
},
   youtube = {
   name: 'Youtube',
   reg_url: /www\.youtube\.com/,
   text: 'yt'
};

var bangs = [amazon, gimages, bimages, map, news, wikipedia];

var wd, searchbar, searchbar_text;

// Build the webdriver
function init() {
	var options = new chrome.Options().addExtensions(EXT_PATH);

	wd = new Builder()
		.forBrowser('chrome')
		.setChromeOptions(options)
		.build();
}


function tearDown() {
     wd.quit();
}

// Test functionality in the popup modal:
// searchbar, bangs and visible options
function testPopup() {
	wd.get(POPUP_URL);

	// Test searchbar in the popup modal
	searchbar = wd.findElement({id:'search_form_input_homepage'});
	new assert.Assertion(searchbar.isDisplayed(), 'Searchbar exists and is displayed');

	wd.sleep(500);

	searchbar_text = searchbar.getText()
		.then(function(text){ return text; });
	new assert.Assertion(searchbar_text).equals('', 'Searchbar is empty');

	wd.wait(searchbar_text);
	
	searchbar.sendKeys('Philadelphia');

	testBangs(bangs[0])
	.then(function(result) {testBangs(bangs[1]);})
	.then(function(result) {testBangs(bangs[2]);});
		
	//test_b.then(function(){console.log('finished testing')});	
}

// Test bangs
function testBangs(bang) {
	//for (var i = 0; i < bangs.length; i++) {
	//var bang = bangs[i];
	var bang_btn = wd.findElement({id:BASE_BANG_ID + bang.text});

	console.log(bang.name);
	var promise_clickbang = wd.actions()
		.click(bang_btn)
		.perform();

	wd.wait(promise_clickbang);

	searchbar = wd.findElement({id:'search_form_input_homepage'});
	var bang_text = searchbar.getAttribute('value')
		.then(function(text){ 
			var control_txt = new RegExp('!' + bang.text);
			var assert_msg = 'Searchbar contains ' + bang.name + ' bang';
			new assert.Assertion(text).matches(control_txt, assert_msg);
		});

	wd.wait(bang_text);

	var search_btn = wd.findElement({id:'search_button_homepage'});

	var promise_clickbtn = wd.actions()
		.click(search_btn)
		.perform();

	wd.wait(promise_clickbtn).then(function(){console.log('clicked search for bang ' + bang.text + ' ' + bang.name)});

	// Switch to new tab
	var promise_tab =  wd.getAllWindowHandles().then(function(tabs) { 
		//console.log(tabs); 
		new assert.Assertion(tabs.length).greaterThan(1, 'New tab opened ' + tabs);
		wd.switchTo().window(tabs[1])
			.then(function(){ testBangUrl(wd, bang);})
			.then(function(){ wd.close();})
			.then(function(){ wd.switchTo().window(tabs[0])});
		//wd.switchTo().window(tabs[0]);
		
	});

	return promise_tab;
        //}
	
}



// Test whether searching using a bang redirects to the correct site
function testBangUrl(wd, bang) {
	var msg = bang.name + ' bang search redirected to the correct site: ';
	var promise_url = wd.getCurrentUrl()
		.then(function(url) { 
			new assert.Assertion(url).matches(bang.reg_url, msg + url);
		});
	return promise_url;
}


function main() {
	init();
	testPopup();
//	testBangs();
	// coming soon
	/*
	testOptions();
	testBackground();
	*/
	tearDown();
}

main();
