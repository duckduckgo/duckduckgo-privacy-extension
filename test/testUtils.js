/* Pass an array of chrome tab objects to be closed */
function cleanUpTabs(tabs) {
    tabs.forEach((tab) => chrome.tabs.remove(tab.id));
}

/* Wait for a tab to finish loading and return the chrome tab object 
 * getLoadedTab(<url>).then( do stuff );
 */

function getLoadedTab(tabURL) {
    return new Promise((resolve) => {
        chrome.tabs.query({url: tabURL + "*"}, (tabs) => {
            if (tabs) {
                let tab = tabs[0];
                if (tab && tab.status === 'complete') {
                    // return tab
                    resolve(tab);
                }
                else {
                    // return new promise and wait
                    resolve(getLoadedTab(tabURL));
                }
            }
        });
    });
}


function waitForActiveTab(url) {
    return new Promise((resolve) => {
        chrome.tabs.query({url: url + "*"}, (tabs) => {
            if (tabs) {
                let tab = tabs[0];
                if (tab.active === true && tab.status === "complete") {
                    // return tab
                    resolve(tab);
                }
                else {
                    // return new promise and wait
                    resolve(getLoadedTab(url));
                }
            }
        });
    });
}
