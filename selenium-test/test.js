var chrome = require('selenium-webdriver/chrome'),
    webdriver = require('selenium-webdriver'),
    test = require('selenium-webdriver/testing'),
    assert = require('selenium-webdriver/testing/assert'),
    input = require('selenium-webdriver/lib/input'),
    logger = require('selenium-webdriver/lib/logging'),
    localStorage = require('localStorage');

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

var bangs = [amazon, gimages, bimages, news, wikipedia];

var wd, searchbar, searchbar_text, search_btn;

// Build the webdriver
function init() {
        var options = new chrome.Options().addExtensions(EXT_PATH);

        wd = new webdriver.Builder()
                .forBrowser('chrome')
                .setChromeOptions(options)
                .build();
}

// Close the browser window
function tearDown() {
    wd.quit();
}

// Test functionality in the popup modal:
// searchbar, bangs and visible options
function testSearchbar() {
        wd.get(POPUP_URL);

        // Test searchbar in the popup modal
        searchbar = wd.findElement({id:'search_form_input_homepage'});
        new assert.Assertion(searchbar.isDisplayed(), 'Searchbar exists and is displayed');

        wd.sleep(500);

        searchbar_text = searchbar.getText()
                .then(function(text){ 
                new assert.Assertion(text).equals('', 'Searchbar is empty');
         });
}

// Test clicking on bangs and then performing a search
function testBangs(bang) {
        var bang_btn = wd.findElement({id:BASE_BANG_ID + bang.text});
    
    wd.actions().click(bang_btn).perform().then(function(){
        searchbar = wd.findElement({id:'search_form_input_homepage'});
        
        searchbar.getAttribute('value').then(function(text){

                var control_txt = new RegExp('!' + bang.text);
                var assert_msg = 'Searchbar contains ' + bang.name + ' bang';
           
                new assert.Assertion(text).matches(control_txt, assert_msg);

                var search_btn = wd.findElement({id:'search_button_homepage'});
                var msg = bang.name + ' bang search redirected to the correct site: ';
                testNewTabUrl(search_btn, msg, bang.reg_url);
        });
    });
}

// Return true if searching using a bang redirects to the correct site
function testUrl(msg, test_url) {
   return  wd.getCurrentUrl().then(function(url) {
        console.log("URL: " + url); 
        if (url.match(test_url)){
            return true;
        } else {
            new logger.Logger('Expected URL differs from current URL: ' + url, logger.Level.WARNING);
            return false;
        }
    });
}

// Test queries in DDG searchbar redirect to duckduckgo.com
function testDdgSearch() {
        var x_btn = wd.findElement({id:'search_form_input_clear'});
        search_btn = wd.findElement({id:'search_button_homepage'});

return  wd.actions()
        .click(x_btn)
        .perform()
        .then(function() {
                testNewTabUrl(search_btn, 'Searching on DDG', /duckduckgo\.com/);
        });
}

// Test newly opened tab and its URL
function testNewTabUrl(click_el, msg, test_url) {
        return wd.actions()
        .click(click_el)
        .perform()
        .then(function() {
                return wd.getAllWindowHandles().then(function(tabs) {
                        wd.wait(new webdriver.Condition('new tab opened', function() {return tabs.length > 1}), 5000).then(function() {
                            if (tabs.length <= 1) {
                                new logger.Logger('Expected new tab to open - going to next test (this can happen sometimes, try the test again)', logger.Level.WARNING);
                            } else {
                                wd.switchTo().window(tabs[1])
                                .then(function() {
                                    testUrl(msg, test_url);
                                    wd.close();
                                    return wd.switchTo().window(tabs[0]);
                            }, 5000);
                            }
                        }, 5000);
                });
        });
}

// Test clicking on the More Bangs link redirects to the bangs page
function testMoreBangs() {
        var bangs_link = wd.findElement(webdriver.By.css('.link.bang a'));
        testNewTabUrl(bangs_link, "More Bangs link opens bangs page", /duckduckgo\.com\/bang/);
}

// Test clicking on the More Options link redirects to options.html
function testMoreOptions() {
        var options_link = wd.findElement(webdriver.By.css('.link.more a'));
        var opts_url = new RegExp(MORE_OPTIONS_URL);
        testNewTabUrl(options_link, "More Options link opens options.html", opts_url);
}

// Test options are saved in localStorage
function testOptionClick(option, cb) {
    var defaultOpt = localStorage[option];
    console.log("Testing option: " + option);
    wd.actions()
        .click(wd.findElement({id: option}))
        .perform()
        .then(function() {
        new assert.Assertion(localStorage[option] !== defaultOpt, "Option test: " + option);
        cb();
    });
}

// Test options in options.html
function testOptions() {
    var options = [
    {
        id: 'zeroclick_google_right',
        action: null
    },{
        id: 'use_post',
        action: null
    },{
        id: 'safesearch',
        action: safeSearch,
    },{
        id: 'lastsearch_enabled',
        action: rememberLastSearch
    }];

    options.forEach(function(option){
            wd.get(MORE_OPTIONS_URL).then(function(){
            testOptionClick(option.id, function(){
                if(option.action)
                    option.action();
            });
        });
    });
}

// Test "show meanings" option, checked and unchecked
function testMeanings() {
    var meanings = wd.findElement({id:'adv_meanings'});
    
    search_btn = wd.findElement({id:'search_button_homepage'});    
    var reg_url =  /^((?!\&d\=1).)*$/;
 
    return testNewTabUrl(search_btn, "Meanings showing for DDG searches", reg_url);
}

// No way to test this so far. Doesn't seem to work on Chrome anyway
var rememberLastSearch = function() {
    console.log("Testing remember last search");
}

// Test expanding and collapsing the Popup modal advanced content
function testExpandCollapse(collapsed) {
    var expand_btn = wd.findElement({id:'icon_advanced'});
    
    return wd.actions()
    .click(expand_btn)
    .perform()
    .then(function() {
        var modal_content = wd.findElement({id:'advanced'}).getCssValue('display')
        .then(function(display) {
             var test_display = collapsed? 'none' : 'block';
             var state = collapsed? 'collapsed' : 'expanded';
             new assert.Assertion(display).equals(test_display, 'Popup modal ' + state);
        });
    });
}

// Test performing a search after clicking on "I'm Feeling Ducky"
function testFeelingDucky() {
    search_btn = wd.findElement({id:'search_button_homepage'});
    searchbar = wd.findElement({id:'search_form_input_homepage'});
    var reg_url = /^((duckduckgo\.com).)*$/;

    //var feelducky = wd.findElement({id:'adv_ducky'});
    wd.actions()
    .click(wd.findElement({id:'adv_ducky'}))
    .perform()
    .then(function() {
       searchbar.sendKeys('Philadelphia')
       .then(function() {
            return testNewTabUrl(search_btn, "Feeling ducky redirects to site", reg_url);    
       });
    });
}

// Test turning safe search off adds the right param to the search URL
var safeSearch = function() {
    console.log("Testing Safesearch");
    wd.get(POPUP_URL);
    search_btn = wd.findElement({id:'search_button_homepage'});    
    var reg_url = new RegExp('&kp=-1');
 
    testNewTabUrl(search_btn, "Safe search option turned off in DDG searches", reg_url);
    
}

// Run all the tests
function main() {
    init();
    
    testSearchbar();

    bangs.forEach(function(bang){
            testBangs(bang);
    });
    
    testDdgSearch()
    .then(function() {
        testMoreBangs();
    })
    .then(function() {
        testMoreOptions();
    })
    .then(function() {
        testMeanings();
    })
    .then(function() {
        testExpandCollapse(true);
    })
    .then(function() {
         testExpandCollapse(false);
    })
    /*.then(function() {
         testFeelingDucky();
    })*/
    .then(function() {
        testOptions();
    });
    
    tearDown();
}

main();
