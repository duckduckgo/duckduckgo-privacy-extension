var ATB = (() => {
    var ddgRegex = '/duckduckgo\.com';
    var ddgAtbURL = 'https://duckduckgo.com/atb.js?';

    return {
        updateSetAtb: () => {
            return new Promise((resolve, reject) => {
                let atbSetting = settings.getSetting('atb'),
                    setAtbSetting = settings.getSetting('set_atb');

                if(!atbSetting || !setAtbSetting)
                    resolve(null);

                ATB.getSetAtb(atbSetting, setAtbSetting).then((newAtb) => {
                    if(newAtb !== setAtbSetting){
                        settings.updateSetting('set_atb', newAtb);
                    }
                    resolve(newAtb);
                });
            });
        },

        getSetAtb: (atbSetting, setAtb, callback) => {
            return new Promise((resolve, reject) => {
                var xhr = new XMLHttpRequest();

                xhr.onreadystatechange = function() {
                    if(xhr.readyState === XMLHttpRequest.DONE){
                        if(xhr.status == 200){
                            let curATB = JSON.parse(xhr.responseText);
                            resolve(curATB.version);
                        }
                    }
                };

                let randomValue = Math.ceil(Math.random() * 1e7);
                let AtbRequestURL = ddgAtbURL + randomValue + '&atb=' + atbSetting + '&set_atb=' + setAtb;

                xhr.open('GET', AtbRequestURL, true );
                xhr.send();
            });
        },

        redirectURL: (request) => {
            if(request.url.search(ddgRegex) !== -1){
                
                if(request.url.indexOf('atb=') !== -1){
                    return;
                }

                let atbSetting = settings.getSetting('atb');

                if(!atbSetting){
                    return;
                }

                let newURL = request.url + "&atb=" + atbSetting;

                return {redirectUrl: newURL};
            }
        },

        setInitialVersions: () => {
            console.log("Setting intial versions");
            if(!settings.getSetting('atb')){
                let versions = ATB.calculateInitialVersions();
                console.log("Versions: ", versions);
                if(versions && versions.major && versions.minor){
                    settings.updateSetting('atb', 'v' + versions.major + '-' +versions.minor);
                }
            }
        },

        calculateInitialVersions: () => {
            let oneWeek = 604800000,
                oneDay = 86400000,
                oneHour = 3600000,
                oneMinute = 60000,
                estEpoch = 1456290000000,
                localDate = new Date(),
                localTime = localDate.getTime(),
                utcTime = localTime + (localDate.getTimezoneOffset() * oneMinute),
                est = new Date(utcTime + (oneHour * -5)),
                dstStartDay = 13 - ((est.getFullYear() - 2016) % 6),
                dstStopDay = 6 - ((est.getFullYear() - 2016) % 6),
                isDST = (est.getMonth() > 2 || (est.getMonth() == 2 && est.getDate() >= dstStartDay)) && (est.getMonth() < 10 || (est.getMonth() == 10 && est.getDate() < dstStopDay)),
                epoch = isDST ? estEpoch - oneHour : estEpoch,
                timeSinceEpoch = new Date().getTime() - epoch,
                majorVersion = Math.ceil(timeSinceEpoch / oneWeek),
                minorVersion = Math.ceil(timeSinceEpoch % oneWeek / oneDay);        
            return {"major": majorVersion, "minor": minorVersion};
        },

        setAtbValuesFromSuccessPage: (atb) => {
            console.log("Setting atb from success page ", atb);
            if(!settings.getSetting('set_atb')){
                settings.updateSetting('atb', atb);
                settings.updateSetting('set_atb', atb);
            }

            let xhr = new XMLHttpRequest();
            xhr.open('GET', 'https://duckduckgo.com/exti/?atb=' + atb, true);
            xhr.send();
        },

        inject: () => {
            chrome.tabs.query({ url: 'https://*.duckduckgo.com/*' }, function (tabs) {
                var i = tabs.length, tab;
                while (i--) {
                    tab = tabs[i];
                    
                    chrome.tabs.executeScript(tab.id, {
                        file: 'js/oninstall.js'
                    });
                    
                    chrome.tabs.insertCSS(tab.id, {
                        file: 'css/noatb.css'
                    });
                }
            });
        },

        onInstalled: () => {
            ATB.setInitialVersions();
            ATB.inject();
            
            if (!chrome.extension.inIncognitoContext) {
                chrome.tabs.create({url: "/html/intro.html"});
            }
        }
    }
})();

// register message listener
chrome.runtime.onMessage.addListener((request) => {
    if(request.atb){
        ATB.setAtbValuesFromSuccessPage(request.atb);
    }
});
