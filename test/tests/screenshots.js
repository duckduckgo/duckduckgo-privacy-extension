var sites;
var params = getParams();
var screenshots = [];
sites = buildSitesToTest();
processSite();


/*
 * Get test params from the url and set any defaults
 */
if (!params.numberToTest) {
    params.numberToTest = 10;
}
else if(params.numberToTest > top500Sites.length){
    params.numberToTest = top500Sites.length
}

/*
 * Build a summary table of results with
 * side by side screenshots
 */
function buildSummary() {
    let table = '<table><tr><td><b>Tracker Blocking ON</b></td><td><b>Tracker Blocking OFF</b></td></tr>';

    screenshots.forEach((x) => {
        table += '<tr><td>Site Score: ' + x.score + ' <a href="' + x.url + '">' + x.url + '</a></td><td></tr>';
        table += '<tr><td><img id="on" src="' + x.on + '" /></td>';
        table += '<td><img id="off" src="' + x.off + '" /></td></tr>';
    });
    table += '</table>';

    // add the screenshots to the page
    params.screenshots ? $('#screenshots').prepend(table) : null

    if (params.json) {
        // remove image data before printing on the screen
        screenshots.map((x) => {
            delete x.on
            delete x.off
        })
        $('#screenshots').append(`<h2>JSON Output</h2> <p id="json-data">${JSON.stringify(screenshots, null, 4)}</p>`);
    }
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
        buildSummary();
        return;
    }

    let url = "http://" + site + '/';

    newScreenshots = {url: url};

    // turn tracker blocking and https on
    resetSettings(true);

    // run test with tracker blocking and https
    runTest(url).then(() => {

        // turn tracker blocking off
        resetSettings(false);
        
        runTest(url).then(() => {
            
            screenshots.push(newScreenshots)
            processSite();
        })
    })  
}

/*
 * Navigate to a url, take a screenshot and record the page load time
 */
function runTest(url) {
    return new Promise((resolve) => {

        let blockingOnStartTime = Date.now();

        chrome.tabs.create({url: url}, (t) => {

            getLoadedTabById(t.id, blockingOnStartTime, 8000, 1000).then((tab) => {
                let blocking = bkg.settings.getSetting('trackerBlockingEnabled')
                let tabObj = bkg.tabManager.get({'tabId': tab.id});

                if (blocking) {
                    newScreenshots.scoreObj = tabObj.site.score;
                    newScreenshots.score = tabObj.site.score.get()
                }

                takeScreenshot().then((image) => {
                    blocking ? newScreenshots.on = image : newScreenshots.off = image
                    chrome.tabs.remove(tab.id);
                    resolve();
                })
            })
        });
    });
}

/* Build list of sites to test */
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
