module.exports = {
    _: {},
    r: {
        name: 'privacy_nudge',
        description: 'Privacy nudge experiment',
        active: true,
        atbExperiments: {
            'y': {
                description: 'Privacy nudge control group',
                settings: {
                    bannerEnabled: false
                }
            },
            'z': {
                description: 'Privacy nudge experiment group',
                settings: {
                    bannerEnabled: true
                }
            }
        }
    },
    l: {
        name: 'full tracker list',
        description: 'Testing full Tracker Radar list',
        active: false,
        atbExperiments: {
            'm': {
                descripiton: 'Full list experiment group',
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
