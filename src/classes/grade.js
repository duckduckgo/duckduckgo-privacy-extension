const UNKNOWN_PRIVACY_SCORE = 2

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

    _normalizeTrackerScore (pct) {
        let score

        if (!pct) {
            score = 0
        } else if (pct < 0.1) {
            score = 1
        } else if (pct < 1) {
            score = 2
        } else if (pct < 5) {
            score = 3
        } else if (pct < 10) {
            score = 4
        } else if (pct < 15) {
            score = 5
        } else if (pct < 20) {
            score = 6
        } else if (pct < 30) {
            score = 7
        } else if (pct < 45) {
            score = 8
        } else if (pct < 66) {
            score = 9
        } else {
            score = 10
        }

        return score
    }

    _scoreToGrade (score) {
        let grade

        if (score < 2) {
            grade = 'A'
        } else if (score < 4) {
            grade = 'B+'
        } else if (score < 10) {
            grade = 'B'
        } else if (score < 14) {
            grade = 'C+'
        } else if (score < 20) {
            grade = 'C'
        } else if (score < 30) {
            grade = 'D'
        } else {
            grade = 'D-'
        }

        return grade
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
