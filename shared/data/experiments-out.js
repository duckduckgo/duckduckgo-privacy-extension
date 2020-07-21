module.exports = {
    _: {},
    l: {
        name: 'full tracker list',
        description: 'Testing full Tracker Radar list',
        active: false,
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
    },
    f: {
        name: 'Fingerprint protection',
        description: 'Testing basic fingerprint protection',
        active: true,
        atbExperiments: {
            'k': {
                description: 'Basic fingerprint protection experiment group',
                settings: {
                    experimentData: {
                        fingerprint_protection: true
                    }
                }
            }
        }
    }
}
