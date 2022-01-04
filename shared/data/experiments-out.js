module.exports = {
    _: {},
    l: {
        name: 'full tracker list',
        description: 'Testing full Tracker Radar list',
        active: false,
        atbExperiments: {
            m: {
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
        name: '1st and 3rd party cookie experiment',
        description: 'Testing 3rd party cookie blocking and 1st party cookie expiry',
        active: true,
        atbExperiments: {
            c: {
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
