const settings = require('./settings.es6')
const atbUtils = require('./atb-utils.es6')
const retentionExperiments = require('../../data/experiments-out')
const ATB_FORMAT_RE = /(v\d+-\d(?:[a-z_]{2})?)$/
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
            .then(this.getVariant.bind(this))
            .then(this.getATBVariant.bind(this))
            .then(() => {
                // Only set active experiment once
                if (settings.getSetting('activeExperiment')) return

                this.activeExperiment = retentionExperiments[this.variant] || {}

                if (this.activeExperiment.name) {
                    if (this.activeExperiment.atbExperiments && this.activeExperiment.atbExperiments[this.atbVariant]) {
                        this.activeExperiment.settings = this.activeExperiment.atbExperiments[this.atbVariant].settings
                    }

                    settings.updateSetting('activeExperiment', this.activeExperiment)

                    if (this.activeExperiment.settings) {
                        this.applySettingsChanges()
                    }
                }
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

        return atbUtils.getDaysBetweenCohorts({
            majorVersion: parseInt(majorVersion, 10),
            minorVersion: parseInt(minorVersion, 10)
        }, atbUtils.getCurrentATB())
    }
}

module.exports = new Experiment()
