var sites = top500Sites.slice(0,100);
(function() {
    processSite();
})();

function processSite() {
    let site = sites.pop();

    if(!site){
        return;
    }

    let url = "http://" + site + '/';
    console.log(url);
    chrome.tabs.create({url: url}, (t) => {
        getLoadedTabById(t.id).then((tab) => {
            console.log("Active ", url);
            chrome.tabs.captureVisibleTab((data) => {
                $('#screenshots').prepend('<img id="theImg" src="' + data + '" />');
                chrome.tabs.remove(tab.id);
                processSite();
            }); 
        });
    });
}
