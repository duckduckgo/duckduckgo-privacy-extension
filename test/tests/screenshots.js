(function() {
    const bkg = chrome.extension.getBackgroundPage();
    var params = getTestParams();
    var screenshots = [];
    var sites = buildSitesToTest();
    processSite();
})();

/*
 * Get test params from the url and set any defaults
 */
function getTestParams() {
    
    params = window.location.href
        .split('?')[1]
        .split('&')
        .reduce((params, line) => { 
            let parts = line.split('='); 
            params[parts[0]] = parts[1]; 
            return params;
        }, {});

    if (!params.numberToTest) {
        params.numberToTest = 10;
    }
    else if(params.numberToTest > top500Sites.length){
        params.numberToTest = top500Sites.length
    }
}

/*
 * Build a summary table of results with
 * side by side screenshots
 */
function buildSummary() {
    let table = '<table><tr><td><b>Tracking ON</b></td><td><b>Tracking OFF</b></td></tr>';

    screenshots.forEach((x) => {
        table += '<tr><td>Trackers: ' + x.score + '<a href="' + x.url + '">' + x.url + '</a></td><td>' + x.blockingTime + '</td></tr>';
        table += '<tr><td><img id="on" src="' + x.on + '" /></td>';
        table += '<td><img id="off" src="' + x.off + '" /></td></tr>';
    });
    table += '</table>';

    $('#screenshots').prepend(table);
}

/*
 * Recurse through the list of sites to process. 
 * First turn privacy settings on, visit the site, record data, and take a screenshot
 * repeat with privacy settings off. 
 * Stop when all sites have been processed. Base case calls the buildSummary funciton
 */
function processSite() {
    let site = sites.pop();

    // base case, return and build table
    if(!site){
        buildAndWriteTable();
        return;
    }

    let url = "http://" + site + '/';

    newScreenshots = {url: url};

    // turn tracker blocking and https on
    resetSettings(true);

    // run test with tracker blocking and https
    runTest(url).then(() => {
        // turn tracker blocking and https off
        resetSettings(false);
        
        // run test with settings off
        chrome.browsingData.removeCache({}, (() => {
            runTest(url).then(() => {
                processSite();
            });
        }));
    });     
}

/*
 * update privacy settings to whatever settingState is set to
 */
function resetSettings(settingState) {
    bkg.settings.updateSetting('trackerBlockingEnabled', settingState);
    bkg.settings.updateSetting('httpsEverywhereEnabled', settingState);
}

/*
 * Navigate to a url, take a screenshot and record the page load time
 */
function runTest(url) {
    return new Promise((resolve) => {

        let blockingOnStartTime = Date.now();
        
        chrome.tabs.create({url: url}, (t) => {

            getLoadedTabById(t.id, blockingOnStartTime, 8000).then((tab) => {
                newScreenshots.blockingOnLoadTime = Date.now() - blockingOnStartTime;

                takeScreenshot().then(() => {
                    newScreenshots.score = bkg.tabManager.get({'tabId': tab.id}).getBadgeTotal();
                    chrome.tabs.remove(tab.id);
                    resolve();
                });
            });
        });
    });
}

function takeScreenshot() {
    return new Promise((resolve) => {
        chrome.tabs.captureVisibleTab((data) => {
            screenshots.on = data;
            resolve();
        });
    });
}

/*
 * Build
 */
function buildSitesToTest() {
    // build array of sites to test. Either random or in order
    let sites = [];
    if (params.random) {
        sites = [];

        while (sites.length < params.numberToTest) {
            let site = top500Sites[Math.floor(Math.random()*top500Sites.length)];
        
            // don't add duplicate sites to test
            if (sites.indexOf(site) === -1) {
                sites.push(site);
            }
        }
    }
    else {
        sites = top500Sites.slice(0,params.numberToTest);
    }
    return sites;
}

