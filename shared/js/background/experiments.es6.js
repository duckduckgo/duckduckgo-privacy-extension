const settings = require('./settings.es6')
const retentionExperiments = require('../../data/experiments-out')

class Experiment {
    constructor () {
        this.variant = ''
        this.activeExperiment = {}
    }

    getVariant () {
        const atbVal = settings.getSetting('atb')
        if (atbVal && atbVal[atbVal.length - 2].match(/[a-z]/i)) {
            this.variant = atbVal[atbVal.length - 2]
        } else {
            this.variant = '_'
        }
        return this.variant
    }

    setActiveExperiment () {
        settings.ready()
            .then(this.getVariant.bind(this))
            .then(() => {
                this.activeExperiment = retentionExperiments[this.variant] || {}

                if (this.activeExperiment.name) {
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
}

module.exports = new Experiment()
