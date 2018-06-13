const UNKNOWN_PRIVACY_SCORE = 2

/**
 * Threshold data structures:
 *
 * Used to map a numeric input to an arbitrary output.
 *
 * `steps` defines the range of inputs for each output,
 * `max` defines what happens if the input is above the given ranges
 * `zero` is a special case for when the input is 0 or falsy
 *
 * For example:
 *
 * zero: 'foo',
 * max: 'qux',
 * steps: [
 *     [1, 'bar'],
 *     [2, 'baz']
 * ]
 *
 * means:
 *
 * input <= 0       maps to 'foo'
 * 0 < input < 1    maps to 'bar'
 * 1 <= input < 2   maps to 'baz'
 * input >= 2       maps to 'C'
 */

const TRACKER_THRESHOLDS = {
    zero: 0,
    max: 10,
    steps: [
        [0.1, 1],
        [1, 2],
        [5, 3],
        [10, 4],
        [15, 5],
        [20, 6],
        [30, 7],
        [45, 8],
        [66, 9]
    ]
}

const GRADE_THRESHOLDS = {
    zero: 'A',
    max: 'D-',
    steps: [
        [2, 'A'],
        [4, 'B+'],
        [10, 'B'],
        [14, 'C+'],
        [20, 'C'],
        [30, 'D']
    ]
}

class Grade {
    constructor (attrs) {
        // defaults
        this.hasHttps = false
        this.isAutoUpgradeable = false
        this.privacyScore = UNKNOWN_PRIVACY_SCORE // unknown

        this.entitiesBlocked = {}
        this.entitiesNotBlocked = {}

        this.scores = {
            site: {},
            enhanced: {}
        }

        // set any values that were passed in
        attrs = attrs || {}

        if (attrs.hasHttps) {
            this.setHttps(attrs.hasHttps, attrs.isAutoUpgradeable)
        }
        if (attrs.privacyScore) {
            this.setPrivacyScore(attrs.privacyScore)
        }
        if (attrs.parentEntity) {
            this.setParentEntity(attrs.parentEntity, attrs.prevalence)
        }
        if (attrs.trackersBlocked) {
            this._importTrackersFromDataFile(attrs.trackersBlocked, true)
        }
        if (attrs.trackersNotBlocked) {
            this._importTrackersFromDataFile(attrs.trackersNotBlocked, false)
        }
    }

    setHttps (hasHttps, isAutoUpgradeable) {
        // isAutoUpgradeable implies the site has https
        // make sure hasHttps is correct in case of
        // e.g. a difference between the two lists
        this.hasHttps = hasHttps || isAutoUpgradeable
        this.isAutoUpgradeable = isAutoUpgradeable
    }

    setPrivacyScore (score) {
        this.privacyScore = typeof score === 'number' ? score : UNKNOWN_PRIVACY_SCORE
    }

    addTracker (tracker) {
        let parentEntity = tracker.parentEntity

        if (!parentEntity) return

        let prevalence = tracker.prevalence || 1

        if (tracker.blocked) {
            this.entitiesBlocked[parentEntity] = prevalence
        } else {
            this.entitiesNotBlocked[parentEntity] = prevalence
        }
    }

    setParentEntity (name, prevalence) {
        if (!name || !prevalence) return

        this.entitiesNotBlocked[name] = prevalence
    }

    calculate () {
        // HTTPS
        let siteHttpsScore, enhancedHttpsScore

        if (this.hasHttps && this.isAutoUpgradeable) {
            siteHttpsScore = 0
            enhancedHttpsScore = 0
        } else if (this.hasHttps) {
            siteHttpsScore = 3
            enhancedHttpsScore = 0
        } else {
            siteHttpsScore = 10
            enhancedHttpsScore = 10
        }

        // PRIVACY
        // clamp to 10
        let privacyScore = Math.min(this.privacyScore, 10)

        // TRACKERS
        let siteTrackerScore = 0
        let enhancedTrackerScore = 0

        for (let entity in this.entitiesBlocked) {
            siteTrackerScore += this._normalizeTrackerScore(this.entitiesBlocked[entity])
        }

        for (let entity in this.entitiesNotBlocked) {
            siteTrackerScore += this._normalizeTrackerScore(this.entitiesNotBlocked[entity])
            enhancedTrackerScore += this._normalizeTrackerScore(this.entitiesNotBlocked[entity])
        }

        let siteTotalScore = siteHttpsScore + siteTrackerScore + privacyScore
        let enhancedTotalScore = enhancedHttpsScore + enhancedTrackerScore + privacyScore

        this.scores = {
            site: {
                grade: this._scoreToGrade(siteTotalScore),
                score: siteTotalScore,
                trackerScore: siteTrackerScore,
                httpsScore: siteHttpsScore,
                privacyScore: privacyScore
            },
            enhanced: {
                grade: this._scoreToGrade(enhancedTotalScore),
                score: enhancedTotalScore,
                trackerScore: enhancedTrackerScore,
                httpsScore: enhancedHttpsScore,
                privacyScore: privacyScore
            }
        }
    }

    getGrades () {
        return this.scores
    }

    _getThreshold (value, thresholdData) {
        let steps = thresholdData.steps

        if (!value || value <= 0) {
            return thresholdData.zero
        }

        if (value >= steps[steps.length - 1][0]) {
            return thresholdData.max
        }

        for (let i = 0; i < steps.length; i++) {
            if (value < steps[i][0]) {
                return steps[i][1]
            }
        }
    }

    _normalizeTrackerScore (pct) {
        return this._getThreshold(pct, TRACKER_THRESHOLDS)
    }

    _scoreToGrade (score) {
        return this._getThreshold(score, GRADE_THRESHOLDS)
    }

    _importTrackersFromDataFile (trackers, blocked) {
        let entityList = blocked ? this.entitiesBlocked : this.entitiesNotBlocked

        // NOTE: this makes some assumptions about how this data is passed
        // this format may still be in flux
        for (let entity in trackers) {
            entityList[entity] = trackers[entity].prevalence
        }
    }
}

module.exports = Grade
