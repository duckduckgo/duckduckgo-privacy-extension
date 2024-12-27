const { default: RemoteConfig } = require('../../shared/js/background/components/remote-config');

class MockSettings {
    constructor() {
        this.mockSettingData = new Map();
        this.ready = () => Promise.resolve();
    }

    getSetting(key) {
        return this.mockSettingData.get(key);
    }
    updateSetting(key, value) {
        this.mockSettingData.set(key, value);
    }
}

fdescribe('rollouts', () => {
    function constructMockRemoteConfig() {
        return new RemoteConfig({ settings: new MockSettings() });
    }

    it('test staged rollout for default-enabled feature flag', () => {
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        defaultTrue: {
                            state: 'enabled',
                            rollout: {
                                steps: [
                                    {
                                        percent: 0.1,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'defaultTrue')).toBeFalse();
    });

    it('the disable state of the feature always wins', () => {
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'disabled',
                    features: {
                        fooFeature: {
                            state: 'disabled',
                            rollout: {
                                steps: [
                                    {
                                        percent: 0,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'defaultTrue')).toBeFalse();

        config.updateConfig({
            features: {
                testFeature: {
                    state: 'disabled',
                    features: {
                        fooFeature: {
                            state: 'disabled',
                            rollout: {
                                steps: [
                                    {
                                        percent: 100,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'defaultTrue')).toBeFalse();
    });

    it('the rollout step set to 0 disables the feature', () => {
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            rollout: {
                                steps: [
                                    {
                                        percent: 0,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
    });

    it("the parent feature disabled doesn't interfer with the sub-feature state", () => {
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'disabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            rollout: {
                                steps: [
                                    {
                                        percent: 100,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
    });

    it('the feature incremental steps are ignored when feature disabled', () => {
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'disabled',
                            rollout: {
                                steps: [
                                    {
                                        percent: 1,
                                    },
                                    {
                                        percent: 2,
                                    },
                                    {
                                        percent: 100,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
    });

    it('the feature incremental steps are executed when feature is enabled', () => {
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            rollout: {
                                steps: [
                                    {
                                        percent: 0.5,
                                    },
                                    {
                                        percent: 1.5,
                                    },
                                    {
                                        percent: 2,
                                    },
                                    {
                                        percent: 100,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
    });

    it('the invalid rollout steps are ignored and not executed', () => {
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            rollout: {
                                steps: [
                                    {
                                        percent: -1,
                                    },
                                    {
                                        percent: 100,
                                    },
                                    {
                                        percent: 200,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
    });

    it('disable a previously enabled incremental rollout', () => {
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            rollout: {
                                steps: [
                                    {
                                        percent: 100,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();

        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'disabled',
                            rollout: {
                                steps: [
                                    {
                                        percent: 100,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
    });
});
