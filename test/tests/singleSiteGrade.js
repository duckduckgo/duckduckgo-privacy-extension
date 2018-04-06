let params = getParams();

$(document).ready(() => {
    // wait a bit to grab lists; yeah it's hacky
    setTimeout(outputData, 2000)
})

function outputData() {
    if (!params.json) { return }

    const siteInfo = JSON.parse(params.json)
    const url = siteInfo.url
    const domain = bkg.utils.extractHostFromURL(url)
    const score = new bkg.Score(false, domain)

    let numTrackersBlocked = 0
    let trackersBlocked = {}
    let trackersNotBlocked = {}

    siteInfo.requests.forEach((request) => {
        const tracker = bkg.trackers.isTracker(
            request[0],
            { url, site: { domain } },
            { type: request[1] }
        )

        if (!(tracker.type === 'trackersWhitelist' &&
                tracker.reason !== 'first party')) {
            score.update({ trackerBlocked: tracker })

            if (!trackersBlocked[tracker.parentCompany]) {
                trackersBlocked[tracker.parentCompany] = {}
            }

            trackersBlocked[tracker.parentCompany][tracker.url] = tracker
        } else {
            if (!trackersNotBlocked[tracker.parentCompany]) {
                trackersNotBlocked[tracker.parentCompany] = {}
            }

            trackersNotBlocked[tracker.parentCompany][tracker.url] = tracker
        }
    })

    if (bkg.https.canUpgradeHost(domain)) {
        score.hasHTTPS = true
    }

    // get score / decisions
    score.get()

    let out = { url, trackersBlocked, trackersNotBlocked }

    out.scoreObj = {
        hasHTTPS: score.hasHTTPS,
        specialPage: score.specialPage,
        inMajorTrackingNetwork: score.inMajorTrackingNetwork,
        totalBlocked: score.totalBlocked,
        hasObscureTracker: score.hasObscureTracker,
        domain: score.domain,
        decisions: score.decisions
    }

    $('body').append(`<div id="json-data">${JSON.stringify(out)}</div>`)
}
