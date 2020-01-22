const transform = require('../../../scripts/mv3/imports/trasformRules')

describe('transform TDS into MV3 rules', () => {
    it('should process empty TDS', () => {
        const result = transform({
            trackers: [],
            entities: []
        })

        expect(result.stats.allRules).toEqual(0)
        expect(result.rules).toEqual([])
    })

    it('should produce basic block rules', () => {
        const result = transform({
            trackers: {
                'tracker.com': {
                    domain: 'tracker.com',
                    default: 'block',
                    owner: {
                        name: 'Tracker Org'
                    }
                }
            },
            entities: []
        })

        expect(result.stats.allRules).toEqual(1)
        expect(result.stats.blockRules).toEqual(1)
        expect(result.rules.length).toEqual(1)
        expect(result.rules).toEqual([{
            id: 1,
            priority: 2,
            action: {type: 'block'},
            condition: {
                urlFilter: '||tracker.com',
                isUrlFilterCaseSensitive: false,
                excludedResourceTypes: [ 'main_frame' ],
                domainType: 'thirdParty'
            }
        }])
    })

    it('should take entity list entries into account', () => {
        const result = transform({
            trackers: {
                'tracker.com': {
                    domain: 'tracker.com',
                    default: 'block',
                    owner: {
                        name: 'Tracker Org'
                    }
                }
            },
            entities: {
                'Tracker Org': {
                    domains: [
                        'tracker.com',
                        'a-tracker.com',
                        'b-tracker.com'
                    ]
                }
            }
        })

        expect(result.stats.allRules).toEqual(1)
        expect(result.stats.blockRules).toEqual(1)
        expect(result.rules).toEqual([{
            id: 1,
            priority: 2,
            action: {type: 'block'},
            condition: {
                urlFilter: '||tracker.com',
                isUrlFilterCaseSensitive: false,
                excludedResourceTypes: [ 'main_frame' ],
                domainType: 'thirdParty',
                excludedDomains: [
                    'a-tracker.com',
                    'b-tracker.com'
                ]
            }
        }])
    })

    it('should take "rules" into account', () => {
        const result = transform({
            trackers: {
                'tracker.com': {
                    domain: 'tracker.com',
                    default: 'block',
                    owner: {
                        name: 'Tracker Org'
                    },
                    rules: [
                        {
                            rule: 'tracker.com/picture.jpg',
                            action: 'ignore',
                            exceptions: {
                                domains: ['a.com', 'b.com'],
                                types: ['image']
                            }
                        }
                    ]
                }
            },
            entities: {}
        })

        expect(result.stats.allRules).toEqual(2)
        expect(result.stats.blockRules).toEqual(1)
        expect(result.stats.ignoreRules).toEqual(1)
        expect(result.rules).toEqual([{
            id: 1,
            priority: 2,
            action: {type: 'block'},
            condition: {
                urlFilter: '||tracker.com',
                isUrlFilterCaseSensitive: false,
                excludedResourceTypes: [ 'main_frame' ],
                domainType: 'thirdParty'
            }
        }, {
            id: 2,
            priority: 4,
            action: {type: 'allow'},
            condition: {
                urlFilter: '||tracker.com/picture.jpg',
                isUrlFilterCaseSensitive: false,
                excludedResourceTypes: [ 'main_frame', 'image' ],
                domainType: 'thirdParty',
                excludedDomains: ['a.com', 'b.com']
            }
        }])
    })

    it('should handle "ignore" by default and create block rules for exceptions', () => {
        const result = transform({
            trackers: {
                'good.com': {
                    domain: 'good.com',
                    default: 'ignore',
                    owner: {
                        name: 'Good Org'
                    },
                    rules: [
                        {
                            rule: 'good.com/tracker.js'
                        }
                    ]
                }
            },
            entities: {}
        })

        expect(result.stats.allRules).toEqual(1)
        expect(result.stats.blockRules).toEqual(1)
        expect(result.stats.ignoreRules).toEqual(0)
        expect(result.rules).toEqual([{
            id: 1,
            priority: 2,
            action: {type: 'block'},
            condition: {
                urlFilter: '||good.com/tracker.js',
                isUrlFilterCaseSensitive: false,
                excludedResourceTypes: [ 'main_frame' ],
                domainType: 'thirdParty'
            }
        }])
    })

    it('should support surrogates', () => {
        const result = transform({
            trackers: {
                'tracker.com': {
                    domain: 'tracker.com',
                    default: 'ignore',
                    owner: {
                        name: 'Tracker Org'
                    },
                    rules: [
                        {
                            rule: 'tracker.com/tracker.js',
                            surrogate: 'tracker-tracker.js'
                        }
                    ]
                }
            },
            entities: {}
        })

        expect(result.stats.allRules).toEqual(1)
        expect(result.stats.blockRules).toEqual(0)
        expect(result.stats.ignoreRules).toEqual(0)
        expect(result.stats.surrogates).toEqual(1)
        expect(result.rules).toEqual([{
            id: 1,
            priority: 3,
            action: {
                type: 'redirect',
                redirect: {
                    extensionPath: '/data/tracker_lists/surrogates/tracker-tracker.js'
                }
            },
            condition: {
                urlFilter: '||tracker.com/tracker.js',
                isUrlFilterCaseSensitive: false,
                excludedResourceTypes: [ 'main_frame' ],
                domainType: 'thirdParty'
            }
        }])
    })

    it('should merge first-party domains with domains on exceptions list', () => {
        const result = transform({
            trackers: {
                'tracker.com': {
                    domain: 'tracker.com',
                    default: 'ignore',
                    owner: {
                        name: 'Tracker Org'
                    },
                    rules: [
                        {
                            rule: 'tracker.com/tracker1.js',
                            exceptions: {
                                domains: ['a.com', 'b.com']
                            }
                        },
                        {
                            rule: 'tracker.com/tracker2.js',
                            surrogate: 'tracker-tracker.js',
                            exceptions: {
                                domains: ['c.com', 'd.com']
                            }
                        }
                    ]
                }
            },
            entities: {
                'Tracker Org': {
                    domains: [
                        'tracker.com',
                        'a-tracker.com',
                        'b-tracker.com'
                    ]
                }
            }
        })

        expect(result.stats.allRules).toEqual(2)
        expect(result.stats.blockRules).toEqual(1)
        expect(result.stats.surrogates).toEqual(1)
        expect(result.rules).toEqual([{
            id: 1,
            priority: 2,
            action: {type: 'block'},
            condition: {
                urlFilter: '||tracker.com/tracker1.js',
                isUrlFilterCaseSensitive: false,
                excludedResourceTypes: [ 'main_frame' ],
                excludedDomains: ['a-tracker.com', 'b-tracker.com', 'a.com', 'b.com'],
                domainType: 'thirdParty'
            }
        }, {
            id: 2,
            priority: 3,
            action: {
                type: 'redirect',
                redirect: {
                    extensionPath: '/data/tracker_lists/surrogates/tracker-tracker.js'
                }
            },
            condition: {
                urlFilter: '||tracker.com/tracker2.js',
                isUrlFilterCaseSensitive: false,
                excludedResourceTypes: [ 'main_frame' ],
                excludedDomains: ['a-tracker.com', 'b-tracker.com', 'c.com', 'd.com'],
                domainType: 'thirdParty'
            }
        }])
    })
})
