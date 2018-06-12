const UNKNOWN_PRIVACY_SCORE = 2

class Grade {
    constructor (attrs) {
        // defaults
        this.hasHttps = false
        this.isAutoUpgradeable = false
        this.privacyScore = UNKNOWN_PRIVACY_SCORE // unknown

        this.companiesBlocked = {}
        this.companiesNotBlocked = {}

        this.scores = {
            site: {},
            enhanced: {}
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
        let parentCompany = tracker.parentCompany

        if (!parentCompany) return

        if (tracker.blocked) {
            this.companiesBlocked[parentCompany] = tracker.prevalence || 1
        } else {
            this.companiesNotBlocked[parentCompany] = tracker.prevalence || 1
        }
    }

    setParentCompany (name, prevalence) {
        if (!name || !prevalence) return

        this.companiesNotBlocked[name] = prevalence
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

        for (let company in this.companiesBlocked) {
            siteTrackerScore += this.normalizeTrackerScore(this.companiesBlocked[company])
        }

        for (let company in this.companiesNotBlocked) {
            siteTrackerScore += this.normalizeTrackerScore(this.companiesNotBlocked[company])
            enhancedTrackerScore += this.normalizeTrackerScore(this.companiesNotBlocked[company])
        }

        let siteTotalScore = siteHttpsScore + siteTrackerScore + privacyScore
        let enhancedTotalScore = enhancedHttpsScore + enhancedTrackerScore + privacyScore

        this.scores = {
            site: {
                grade: this.scoreToGrade(siteTotalScore),
                score: siteTotalScore,
                trackerScore: siteTrackerScore,
                httpsScore: siteHttpsScore,
                privacyScore: privacyScore
            },
            enhanced: {
                grade: this.scoreToGrade(enhancedTotalScore),
                score: enhancedTotalScore,
                trackerScore: enhancedTrackerScore,
                httpsScore: enhancedHttpsScore,
                privacyScore: privacyScore
            }
        }
    }

    normalizeTrackerScore (pct) {
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

    scoreToGrade (score) {
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

    get () {
        return this.scores
    }
}

module.exports = Grade
