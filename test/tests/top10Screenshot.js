var sites = top500Sites.slice(0,20);
(function() {
    processSite();
})();

function processSite() {
    let site = sites.pop();

    if(!site){
        return;
    }

    let url = "https://" + site + '/';
    console.log(url);
    chrome.tabs.create({url: url});
    
    getLoadedTab( '*://*.' + site + '/').then((tab) => {
        console.log("Active ", url);
        chrome.tabs.captureVisibleTab((data) => {
            $('#screenshots').prepend('<img id="theImg" src="' + data + '" />');
            chrome.tabs.remove(tab.id);
            processSite();
        }); 
    });
}
