const settings = require('./settings.es6')
const retentionExperiments = require('../../data/experiments-out')
const ATB_FORMAT_RE = /(v\d+-\d(?:[a-z_]{2})?)$/

function _getDaysBetweenCohorts (cohort1, cohort2) {
    return 7 * (cohort2.majorVersion - cohort1.majorVersion) +
        (cohort2.minorVersion - cohort1.minorVersion)
}

function getCurrentATB () {
    let oneWeek = 604800000
    let oneDay = 86400000
    let oneHour = 3600000
    let oneMinute = 60000
    let estEpoch = 1456290000000
    let localDate = new Date()
    let localTime = localDate.getTime()
    let utcTime = localTime + (localDate.getTimezoneOffset() * oneMinute)
    let est = new Date(utcTime + (oneHour * -5))
    let dstStartDay = 13 - ((est.getFullYear() - 2016) % 6)
    let dstStopDay = 6 - ((est.getFullYear() - 2016) % 6)
    let isDST = (
        est.getMonth() > 2 || (est.getMonth() === 2 && est.getDate() >= dstStartDay)) &&
            (est.getMonth() < 10 || (est.getMonth() === 10 && est.getDate() < dstStopDay))
    let epoch = isDST ? estEpoch - oneHour : estEpoch
    let timeSinceEpoch = new Date().getTime() - epoch
    let majorVersion = Math.ceil(timeSinceEpoch / oneWeek)
    let minorVersion = Math.ceil(timeSinceEpoch % oneWeek / oneDay)

    return {majorVersion, minorVersion}
}

class Experiment {
    constructor () {
        this.variant = ''
        this.atbVariant = ''
        this.activeExperiment = {}
    }

    getVariant () {
        const atbVal = settings.getSetting('atb')
        if (atbVal && atbVal.match(ATB_FORMAT_RE) && atbVal[atbVal.length - 2].match(/[a-z]/i)) {
            this.variant = atbVal[atbVal.length - 2]
        } else {
            this.variant = '_'
        }
        return this.variant
    }

    getATBVariant () {
        const atbVal = settings.getSetting('atb')
        if (atbVal && atbVal.match(ATB_FORMAT_RE) && atbVal[atbVal.length - 1].match(/[a-z]/i)) {
            this.atbVariant = atbVal[atbVal.length - 1]
        } else {
            this.atbVariant = '_'
        }
        return this.atbVariant
    }

    setActiveExperiment () {
        settings.ready()
            // TODO: REMOVE THIS
            .then(settings.updateSetting('atb', 'v212-5rz'))
            .then(this.getVariant.bind(this))
            .then(this.getATBVariant.bind(this))
            .then(() => {
                this.activeExperiment = retentionExperiments[this.variant] || {}

                // TODO: REMOVE THIS
                console.warn('ATB: "%s"', settings.getSetting('atb'))
                console.warn('VARIANT: "%s"', this.variant)
                console.warn('ATB VARIANT: "%s"', this.atbVariant)
                console.warn('ACTIVE EXPERIMENT: ', this.activeExperiment)
                console.warn('IS ATB EXPERIMENT: ', !!this.activeExperiment.atbExperiments)
                console.warn('TODAY\'S ATB', getCurrentATB())

                if (this.activeExperiment.name) {
                    if (this.activeExperiment.atbExperiments && this.activeExperiment.atbExperiments[this.atbVariant]) {
                        this.activeExperiment.settings = this.activeExperiment.atbExperiments[this.atbVariant].settings
                    }

                    settings.updateSetting('activeExperiment', this.activeExperiment)

                    if (this.activeExperiment.settings) {
                        this.applySettingsChanges()
                    }
                }

                // TODO: REMOVE THIS
                console.warn('BANNER ENABLED: ', settings.getSetting('bannerEnabled'))
            })
    }

    applySettingsChanges () {
        for (let setting in this.activeExperiment.settings) {
            settings.updateSetting(setting, this.activeExperiment.settings[setting])
        }
    }

    getDaysSinceInstall () {
        const cohort = settings.getSetting('atb')
        if (!cohort) return false

        const split = cohort.split('-')
        let majorVersion = split[0]
        let minorVersion = split[1]

        if (!majorVersion || !minorVersion) return

        majorVersion = majorVersion.substring(1)

        // remove any atb variant that may be appended to the setting.
        minorVersion = minorVersion.replace(/[a-z_]/g, '')

        return _getDaysBetweenCohorts({
            majorVersion: parseInt(majorVersion, 10),
            minorVersion: parseInt(minorVersion, 10)
        }, getCurrentATB())
    }
}

module.exports = new Experiment()
