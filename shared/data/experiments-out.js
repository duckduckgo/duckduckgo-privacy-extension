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
    }
}
