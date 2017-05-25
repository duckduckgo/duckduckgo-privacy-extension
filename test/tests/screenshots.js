// get the url param for how many sites to test
var toTest = window.location.href.split('?')[1].split('=')[1] || 10;
var sites = top500Sites.slice(0,toTest);

// store screenshot images
var screenshots = [];

const bkg = chrome.extension.getBackgroundPage();

(function() {
    processSite();
})();

function buildAndWriteTable() {

    let table = '<table><tr><td><b>Tracking ON</b></td><td><b>Tracking OFF</b></td></tr>';

    screenshots.forEach((x) => {
        table += '<tr><td>Trackers: ' + x.score + '<a href="' + x.url + '">' + x.url + '</a></td></tr>';
        table += '<tr><td><img id="on" src="' + x.on + '" /></td>';
        table += '<td><img id="off" src="' + x.off + '" /></td></tr>';
    });

    table += '</table>';

    $('#screenshots').prepend(table);
}


function processSite() {
    let site = sites.pop();

    // base case, return and build table
    if(!site){
        buildAndWriteTable();
        return;
    }

    let url = "http://" + site + '/';
    console.log(url);
    newScreenshots = {url: url};

    bkg.settings.updateSetting('trackerBlockingEnabled', true);
    bkg.settings.updateSetting('httpsEverywhereEnabled', true);

    // open new tab
    chrome.tabs.create({url: url}, (t) => {

        // wait for tab to load
        getLoadedTabById(t.id, Date.now(), 8000).then((tab) => {

            // screenshot
            chrome.tabs.captureVisibleTab((data) => {
                newScreenshots.on = data;
                newScreenshots.score = bkg.tabManager.get({'tabId': tab.id}).getBadgeTotal();

                // turn blocking, https off and reload
                bkg.settings.updateSetting('trackerBlockingEnabled', false);
                bkg.settings.updateSetting('httpsEverywhereEnabled', false);
                chrome.tabs.reload(tab.id, () => {

                    // wait for reload to complete
                    getLoadedTabById(tab.id, Date.now(), 8000).then((tab) => {
                        
                        chrome.tabs.captureVisibleTab((data) => {
                            newScreenshots.off = data;
                            screenshots.unshift(newScreenshots);
                            chrome.tabs.remove(tab.id);

                            // process next site
                            processSite();
                        });
                    });
                });
            }); 
        });
    });
}
