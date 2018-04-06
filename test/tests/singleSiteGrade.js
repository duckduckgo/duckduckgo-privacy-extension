let params = getParams();

$(document).ready(() => {
    if (!params.json) { return }

    const siteInfo = JSON.parse(params.json)
    const url = siteInfo.url
    const domain = bkg.utils.extractHostFromURL(url)

    setTimeout(() => {
        const score = new bkg.Score()

        let numTrackersBlocked = 0

        siteInfo.requests.forEach((request) => {
            const tracker = bkg.trackers.isTracker(
                request[0],
                { url, site: { domain } },
                { type: request[1] }
            )

            if (!(tracker.type === 'trackersWhitelist' &&
                    tracker.reason !== 'first party')) {
                score.update({ trackerBlocked: tracker })
            }
        })

        if (bkg.https.canUpgradeHost(domain)) {
            score.hasHTTPS = true
        }

        console.log(score.get())
    }, 2000)
})
