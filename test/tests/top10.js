(function() {
    top500Sites.slice(0,10).forEach((site) => chrome.tabs.create({url: "http://" + site}));
})();
