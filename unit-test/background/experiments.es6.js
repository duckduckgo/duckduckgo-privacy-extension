const experiment = require('../../shared/js/background/experiments.es6')
const settings = require('../../shared/js/background/settings.es6')
const atbUtils = require('../../shared/js/background/atb-utils.es6')

describe('experiment.getVariant', () => {
    const tests = [{
        atb: 'v123-1ab',
        variant: 'a'
    }, {
        atb: 'v123-1_b',
        variant: '_'
    }, {
        atb: 'v123',
        variant: '_'
    }, {
        atb: '',
        variant: '_'
    }]

    tests.forEach((test) => {
        it(`gets correct variant from settings`, () => {
            spyOn(settings, 'getSetting').and.returnValue(test.atb)
            const result = experiment.getVariant()
            expect(result).toBe(test.variant)
        })
    })
})

describe('experiment.getATBVariant', () => {
    const tests = [{
        atb: 'v123-1ab',
        atbVariant: 'b'
    }, {
        atb: 'v123-1_b',
        atbVariant: 'b'
    }, {
        atb: 'v123',
        atbVariant: '_'
    }, {
        atb: '',
        atbVariant: '_'
    }]

    tests.forEach((test) => {
        it(`gets correct variant from settings`, () => {
            spyOn(settings, 'getSetting').and.returnValue(test.atb)
            const result = experiment.getATBVariant()
            expect(result).toBe(test.atbVariant)
        })
    })
})

describe('experiment.getDaysSinceInstall', () => {
    const tests = [{
        atb: 'v214-1',
        currentATB: {majorVersion: 214, minorVersion: 1},
        diff: 0

    }, {
        atb: 'v214-1',
        currentATB: {majorVersion: 215, minorVersion: 1},
        diff: 7
    },
    {
        atb: 'v215-1',
        currentATB: {majorVersion: 214, minorVersion: 1},
        diff: -7
    }]

    tests.forEach((test) => {
        it(`calculates correct days since install`, () => {
            const baseTime = new Date(test.date)
            jasmine.clock().mockDate(baseTime)

            spyOn(settings, 'getSetting').and.returnValue(test.atb)
            spyOn(atbUtils, 'getCurrentATB').and.returnValue(test.currentATB)

            const result = experiment.getDaysSinceInstall()
            expect(result).toBe(test.diff)
        })
    })
})

// describe('experiment.setActiveExperiment', () => {
//     global.retentionExperiments = {
//         'a': {
//             name: 'active_experiment',
//             description: 'the currently active experiment',
//             settings: {
//                 featureFlag: true
//             }
//         }
//     }

//     const tests = [{
//         atb: 'v123-1ab',
//         variant: 'a',
//         featureFlag: true
//     }, {
//         atb: 'v123-1xy',
//         variant: 'a',
//         featureFlag: false
//     }]

//     beforeEach(() => {
//         // spyOn(settings, 'updateSetting')
//         spyOn(settings, 'ready').and.returnValue(Promise.resolve())
//     })

//     tests.forEach((test) => {
//         it(`parses experiments-out`, () => {
//             spyOn(settings, 'getSetting').and.returnValue(test.atb)
//             experiment.setActiveExperiment()
//             expect(settings.getSetting).toHaveBeenCalled()
//             expect(experiment.variant).toBe(test.variant)
//         })
//     })
// })
