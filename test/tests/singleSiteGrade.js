function getGradeData(siteInfo) {
    const url = siteInfo.url
    const domain = bkg.utils.extractHostFromURL(url)
    const score = new bkg.Score(false, domain)

    let trackers = {}
    let trackersNotBlocked = {}

    // for deduplication
    let trackersByUrl = {}

    siteInfo.requests.forEach((request) => {
        let tracker

        try {
            tracker = bkg.trackers.isTracker(
                request[0],
                { url, site: { domain } },
                { type: request[1] }
            )
        } catch (e) {
            console.log(`error checking tracker for: ${request[0]}`)
        }

        if (tracker && trackersByUrl[tracker.url]) { return }

        if (tracker && tracker.block &&
            !(tracker.type === 'trackersWhitelist' &&
                tracker.reason !== 'first party')) {
            score.update({ trackerBlocked: tracker })

            if (!trackers[tracker.parentCompany]) {
                trackers[tracker.parentCompany] = {}
            }

            trackers[tracker.parentCompany][tracker.url] = tracker
            trackersByUrl[tracker.url] = true
        } else if (tracker) {
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

    let out = { url, trackers, trackersNotBlocked }

    out.scoreObj = {
        hasHTTPS: score.hasHTTPS,
        specialPage: score.specialPage,
        inMajorTrackingNetwork: score.inMajorTrackingNetwork,
        totalBlocked: score.totalBlocked,
        hasObscureTracker: score.hasObscureTracker,
        domain: score.domain,
        decisions: score.decisions
    }

    $('body').html(`<div id="json-data">${JSON.stringify(out)}</div>`)
}
