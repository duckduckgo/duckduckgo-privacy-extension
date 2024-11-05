const UNKNOWN_PRIVACY_SCORE = 2;

/**
 * Range map data structures:
 *
 * Maps a numeric input to an arbitrary output based on provided ranges
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
 * input === 0      maps to 'foo'
 * 0 < input < 1    maps to 'bar'
 * 1 <= input < 2   maps to 'baz'
 * input >= 2       maps to 'qux'
 */

const TRACKER_RANGE_MAP = {
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
        [66, 9],
    ],
};

const GRADE_RANGE_MAP = {
    zero: 'A',
    max: 'D-',
    steps: [
        [2, 'A'],
        [4, 'B+'],
        [10, 'B'],
        [14, 'C+'],
        [20, 'C'],
        [30, 'D'],
    ],
};

class Grade {
    constructor(attrs) {
        // defaults
        this.https = false;
        this.httpsAutoUpgrade = false;
        this.privacyScore = UNKNOWN_PRIVACY_SCORE; // unknown

        this.entitiesBlocked = {};
        this.entitiesNotBlocked = {};

        this.scores = null;

        // set any values that were passed in
        attrs = attrs || {};

        if (attrs.https) {
            this.setHttps(attrs.https, attrs.httpsAutoUpgrade);
        }
        if (typeof attrs.privacyScore !== 'undefined') {
            this.setPrivacyScore(attrs.privacyScore);
        }
        if (attrs.parentEntity) {
            this.setParentEntity(attrs.parentEntity, attrs.prevalence);
        }
        if (attrs.trackersBlocked) {
            Object.keys(attrs.trackersBlocked).forEach((entityName) => {
                this.addEntityBlocked(entityName, attrs.trackersBlocked[entityName].prevalence);
            });
        }
        if (attrs.trackersNotBlocked) {
            Object.keys(attrs.trackersNotBlocked).forEach((entityName) => {
                this.addEntityNotBlocked(entityName, attrs.trackersNotBlocked[entityName].prevalence);
            });
        }
    }

    setHttps(https, httpsAutoUpgrade) {
        this.scores = null;
        this.https = https;
        this.httpsAutoUpgrade = httpsAutoUpgrade;
    }

    setPrivacyScore(score) {
        this.scores = null;
        this.privacyScore = typeof score === 'number' ? score : UNKNOWN_PRIVACY_SCORE;
    }

    addEntityBlocked(name, prevalence) {
        if (!name) return;

        this.scores = null;
        this.entitiesBlocked[name] = prevalence;
    }

    addEntityNotBlocked(name, prevalence) {
        if (!name) return;

        this.scores = null;
        this.entitiesNotBlocked[name] = prevalence;
    }

    setParentEntity(name, prevalence) {
        this.scores = null;
        this.addEntityNotBlocked(name, prevalence);
    }

    calculate() {
        // HTTPS
        let siteHttpsScore, enhancedHttpsScore;

        if (this.httpsAutoUpgrade) {
            siteHttpsScore = 0;
            enhancedHttpsScore = 0;
        } else if (this.https) {
            siteHttpsScore = 3;
            enhancedHttpsScore = 0;
        } else {
            siteHttpsScore = 10;
            enhancedHttpsScore = 10;
        }

        // PRIVACY
        // clamp to 10
        const privacyScore = Math.min(this.privacyScore, 10);

        // TRACKERS
        let siteTrackerScore = 0;
        let enhancedTrackerScore = 0;

        for (const entity in this.entitiesBlocked) {
            siteTrackerScore += this._normalizeTrackerScore(this.entitiesBlocked[entity]);
        }

        for (const entity in this.entitiesNotBlocked) {
            siteTrackerScore += this._normalizeTrackerScore(this.entitiesNotBlocked[entity]);
            enhancedTrackerScore += this._normalizeTrackerScore(this.entitiesNotBlocked[entity]);
        }

        const siteTotalScore = siteHttpsScore + siteTrackerScore + privacyScore;
        const enhancedTotalScore = enhancedHttpsScore + enhancedTrackerScore + privacyScore;

        this.scores = {
            site: {
                grade: this._scoreToGrade(siteTotalScore),
                score: siteTotalScore,
                trackerScore: siteTrackerScore,
                httpsScore: siteHttpsScore,
                privacyScore: privacyScore,
            },
            enhanced: {
                grade: this._scoreToGrade(enhancedTotalScore),
                score: enhancedTotalScore,
                trackerScore: enhancedTrackerScore,
                httpsScore: enhancedHttpsScore,
                privacyScore: privacyScore,
            },
        };
    }

    get() {
        if (!this.scores) this.calculate();

        return this.scores;
    }

    _getValueFromRangeMap(value, rangeMapData) {
        const steps = rangeMapData.steps;

        if (!value || value <= 0) {
            return rangeMapData.zero;
        }

        if (value >= steps[steps.length - 1][0]) {
            return rangeMapData.max;
        }

        for (let i = 0; i < steps.length; i++) {
            if (value < steps[i][0]) {
                return steps[i][1];
            }
        }
    }

    _normalizeTrackerScore(pct) {
        return this._getValueFromRangeMap(pct, TRACKER_RANGE_MAP);
    }

    _scoreToGrade(score) {
        return this._getValueFromRangeMap(score, GRADE_RANGE_MAP);
    }
}

module.exports = Grade;
