var atb = (() => {
    var majorVersion;
    var minorVersion;
    var setAtb;
    var ddgRegex = '/duckduckgo\.com';
    var ddgAtbURL = 'https://duckduckgo.com/atb.js?';

    return {
        updateSetAtb: () => {
            return new Promise((resolve, reject) => {
                let atbSetting = settings.getSetting('atb'),
                    setAtbSetting = settings.getSetting('set_atb');

                if(!atbSetting || !setAtbSetting)
                    reject();

                atb.getSetAtb(atbSetting, setAtbSetting, function(newAtb){
                    if(newAtb !== setAtbSetting){
                        settings.updateSetting('set_atb', newAtb);
                        resolve(newAtb);
                    }
                });
            });
        },

        getSetAtb: (atbSetting, setAtb, callback) => {
            var xhr = new XMLHttpRequest();

            xhr.onreadystatechange = function() {
                if(xhr.readyState === XMLHttpRequest.DONE){
                    if(xhr.status == 200){
                        let curATB = JSON.parse(xhr.responseText);
                        callback(curATB.version);
                    }
                }
            };

            let randomValue = Math.ceil(Math.random() * 1e7);
            let AtbRequestURL = ddgAtbURL + randomValue + '&atb=' + atbSetting + '&set_atb=' + setAtb;

            xhr.open('GET', AtbRequestURL, true );
            xhr.send();

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
        }
    }
})()
