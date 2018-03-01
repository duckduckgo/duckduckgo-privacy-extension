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

function getLoadedTabById(id, startTime, timeout, delay, delayStart) {
    return new Promise((resolve) => {
        chrome.tabs.get(id, (tab) => {
                if (tab && tab.status === 'complete') {

                    if (delay && delayStart) {
                        if ((Date.now() - delayStart) > delay) {
                            resolve(tab);
                        }
                        else {
                            resolve(getLoadedTabById(id, startTime, timeout, delay, delayStart));
                        }
                    }
                    else if (delay && !delayStart) {
                        resolve(getLoadedTabById(id, startTime, timeout, delay, Date.now()));
                    }
                    else {
                        resolve(tab);
                    }
                }
                else if((Date.now() - startTime) > timeout){
                    resolve(tab)
                }
                else {
                    // return new promise and wait
                    resolve(getLoadedTabById(id, startTime, timeout, delay));
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

/* get url params */
function getParams() {
    let params = window.location.href
        .split('?')[1]
        .split('&')
        .reduce((params, line) => {
            let parts = line.split('=')
                params[parts[0]] = decodeURIComponent(parts[1])
                return params
        }, {})

    return params;
}

/* take a screen shot and return the image */
function takeScreenshot() {
    return new Promise((resolve) => {
        chrome.tabs.captureVisibleTab((imageData) => {
            resolve(imageData)
        })
    })
}

/* set tracker blocking and https state */
function resetSettings(settingState) {
    bkg.settings.ready().then(() => {
        bkg.settings.updateSetting('trackerBlockingEnabled', settingState)
        bkg.settings.updateSetting('httpsEverywhereEnabled', settingState)
    })
}

function clearCache () {
    return new Promise((resolve) => {
        const millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7
        const oneWeek = (new Date()).getTime() - millisecondsPerWeek
        chrome.browsingData.remove({'since': oneWeek}, {'cache': true}, () => resolve())
    })
}
