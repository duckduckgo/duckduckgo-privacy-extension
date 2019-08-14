/* This class contains information about what trackers and sites
 * are on a given tab:
 *  id: Chrome tab id
 *  url: url of the tab
 *  site: ref to a Site object
 *  trackers: {object} all trackers requested on page/tab (listed by company)
 *  trackersBlocked: {object} tracker instances we blocked on page/tab (listed by company)
 *      both `trackers` and `trackersBlocked` objects are in this format:
 *      {
 *         '<companyName>': {
 *              parentCompany: ref to a Company object
 *              urls: all unique tracker urls we have seen for this company
 *              count: total number of requests to unique tracker urls for this company
 *          }
 *      }
 */
const gradeIconLocations = {
    'A': 'img/toolbar-rating-a.svg',
    'B+': 'img/toolbar-rating-b-plus.svg',
    'B': 'img/toolbar-rating-b.svg',
    'C+': 'img/toolbar-rating-c-plus.svg',
    'C': 'img/toolbar-rating-c.svg',
    'D': 'img/toolbar-rating-d.svg',
    // we don't currently show the D- grade
    'D-': 'img/toolbar-rating-d.svg',
    'F': 'img/toolbar-rating-f.svg'
}

const Site = require('./site.es6')
const Tracker = require('./tracker.es6')
const HttpsRedirects = require('./https-redirects.es6')
const Companies = require('../companies.es6')
const browserWrapper = require('./../$BROWSER-wrapper.es6')

class Tab {
    constructor (tabData) {
        this.id = tabData.id || tabData.tabId
        this.trackers = {}
        this.trackersBlocked = {}
        this.url = tabData.url
        this.upgradedHttps = false
        this.hasHttpsError = false
        this.mainFrameUpgraded = false
        this.requestId = tabData.requestId
        this.status = tabData.status
        this.site = new Site(this.url)
        this.httpsRedirects = new HttpsRedirects()
        this.statusCode = null // statusCode is set when headers are recieved in tabManager.js
        this.stopwatch = {
            begin: Date.now(),
            end: null,
            completeMs: null
        }
        this.resetBadgeIcon()
    };

    resetBadgeIcon () {
        // set the new tab icon to the dax logo
        browserWrapper.setBadgeIcon({path: 'img/icon_48.png', tabId: this.id})
    }

    updateBadgeIcon (target) {
        if (this.site.specialDomainName) return

        if (this.site.isBroken) {
            this.resetBadgeIcon()
        } else {
            let gradeIcon
            let grade = this.site.grade.get()

            if (this.site.whitelisted) {
                gradeIcon = gradeIconLocations[grade.site.grade]
            } else {
                gradeIcon = gradeIconLocations[grade.enhanced.grade]
            }

            let badgeData = {path: gradeIcon, tabId: this.id}
            if (target) badgeData.target = target

            browserWrapper.setBadgeIcon(badgeData)
        }
    }

    updateSite (url) {
        if (this.site.url === url) return

        this.url = url
        this.site = new Site(url)

        // reset badge to dax whenever we go to a new site
        this.resetBadgeIcon()
    };

    // Store all trackers for a given tab even if we don't block them.
    addToTrackers (t) {
        let tracker = this.trackers[t.tracker.owner.name]
        if (tracker) {
            tracker.increment()
            tracker.update(t)
        } else {
            let newTracker = new Tracker(t)
            this.trackers[t.tracker.owner.name] = newTracker

            // first time we have seen this network tracker on the page
            if (t.tracker.owner.name !== 'unknown') Companies.countCompanyOnPage(t.tracker.owner)

            return newTracker
        }
    };

    addOrUpdateTrackersBlocked (t) {
        let tracker = this.trackersBlocked[t.tracker.owner.name]
        if (tracker) {
            tracker.increment()
            tracker.update(t)
        } else {
            let newTracker = new Tracker(t)
            this.trackersBlocked[newTracker.parentCompany.name] = newTracker
            return newTracker
        }
    };

    endStopwatch () {
        this.stopwatch.end = Date.now()
        this.stopwatch.completeMs = (this.stopwatch.end - this.stopwatch.begin)
        console.log(`tab.status: complete. site took ${this.stopwatch.completeMs / 1000} seconds to load.`)
    }
}

module.exports = Tab
