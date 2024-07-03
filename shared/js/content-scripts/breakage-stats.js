let pageReloaded = false;
let vitals = []

function notifyPageReloaded() {
    (async () => {
        await chrome.runtime.sendMessage({pageReloaded: true});
    })();
}

document.addEventListener("DOMContentLoaded", function (event) {
    const paintResources = performance.getEntriesByType('paint')
    const firstPaint = paintResources.find((entry) => entry.name === 'first-contentful-paint')
    vitals = firstPaint ? [firstPaint.startTime] : []

    pageReloaded = (
        (window.performance.navigation && window.performance.navigation.type === 1) ||
        window.performance
        .getEntriesByType('navigation')
        .map((nav) => nav.type)
        .includes('reload')
    );
    if (pageReloaded)
        notifyPageReloaded();
})

chrome.runtime.onMessage.addListener(
    function (req, sender, sendResponse) {
        if (!req.getBreakagePageParams) return

        sendResponse({
            vitals,
            docRefererrer: document.referrer,
            opener: window.opener
        })
    }
)
