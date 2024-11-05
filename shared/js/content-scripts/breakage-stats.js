let pageReloaded = false;
let jsPerformance = [];

function notifyPageReloaded() {
    (async () => {
        await chrome.runtime.sendMessage({ pageReloaded: true });
    })();
}

new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntriesByName('first-contentful-paint')) {
        jsPerformance = [entry.startTime];
    }
}).observe({ type: 'paint', buffered: true });

document.addEventListener('DOMContentLoaded', function (event) {
    pageReloaded =
        (window.performance.navigation && window.performance.navigation.type === 1) ||
        window.performance
            .getEntriesByType('navigation')
            .map((nav) => nav.type)
            .includes('reload');
    if (pageReloaded) {
        notifyPageReloaded();
    }
});

chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
    if (!req.getBreakagePageParams) return;

    sendResponse({
        jsPerformance,
        docReferrer: document.referrer,
        opener: !!window.opener,
    });
});
