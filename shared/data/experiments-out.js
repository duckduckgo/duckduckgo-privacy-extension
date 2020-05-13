module.exports = {
    _: {},
    r: {
        name: 'multi_step_onboarding',
        description: 'Multi-Step Onboarding',
        active: true,
        atbExperiments: {
            'x': {
                description: 'Multi-Step Onboarding Experiment',
                settings: {
                    isMultiStepOnboarding: true
                }
            }
        }
    },
    l: {
        name: 'full tracker list',
        description: 'Testing full Tracker Radar list',
        active: true,
        atbExperiments: {
            'm': {
                description: 'Full list experiment group',
                settings: {
                    experimentData: {
                        listName: 'tds',
                        url: 'https://staticcdn.duckduckgo.com/trackerblocking/lm/tds.json'
                    }
                }
            }
        }
    }
}
