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
    o: {
        name: '3rd party cookie blocking',
        description: 'Testing 3rd party cookie blocking',
        active: true,
        atbExperiments: {
            'c': {
                description: '3rd party experiment group',
                settings: {
                    experimentData: {
                        blockingActivated: true
                    }
                }
            }
        }
    }
}
