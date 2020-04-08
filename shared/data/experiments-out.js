module.exports = {
    _: {},
    r: {
        name: 'privacy_nudge',
        description: 'Privacy nudge experiment',
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
        atbExperiments: {
            'b': {
                description: 'Full list control group',
                settings: false
            },
            'z': {
                descripiton: 'Full list experiment group',
                settings: {
                    name: 'tds',
                    url: 'https://jason.duckduckgo.com//tds-whole-2.json',
                    format: 'json'
                }
            }
        }
    }
}
