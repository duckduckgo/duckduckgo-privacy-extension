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

describe('rollouts', () => {
    function constructMockRemoteConfig() {
        return new RemoteConfig({ settings: new MockSettings() });
    }

    // Rollout tests: specs copied from the Android browser project.
    // https://github.com/duckduckgo/Android/blob/develop/feature-toggles/feature-toggles-impl/src/test/java/com/duckduckgo/feature/toggles/codegen/ContributesRemoteFeatureCodeGeneratorTest.kt#L624
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

    it('re-enable a previously disabled incremental rollout', () => {
        const config = constructMockRemoteConfig();
        // incremental rollout
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
        // disable the previously enabled incremental rollout
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

        // re-enable the incremental rollout
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
    });

    it('feature was enabled remains enabled and rollout threshold is set', () => {
        const config = constructMockRemoteConfig();
        config.settings.updateSetting('rollouts.testFeature.fooFeature.roll', 10.0);
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
                                        percent: 50,
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

    it('full feature lifecycle', () => {
        const config = constructMockRemoteConfig();
        // all disabled
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'disabled',
                    features: {
                        fooFeature: {
                            state: 'disabled',
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();

        // enable parent feature
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'disabled',
                        },
                    },
                },
            },
        });

        // add rollout information to sub-feature, still disabled
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
                                        percent: 10,
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

        // add more rollout information to sub-feature, still disabled
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
                                        percent: 10,
                                    },
                                    {
                                        percent: 20,
                                    },
                                    {
                                        percent: 30,
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

        // enable rollout
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

        const rolloutThreshold = config.settings.getSetting('rollouts.testFeature.fooFeature.roll');
        // increment rollout but just disabled
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
                                        percent: rolloutThreshold - 1.0,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();

        // increment rollout but just disabled, still
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
                                        percent: rolloutThreshold,
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

        // increment rollout but just enabled
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
                                        percent: rolloutThreshold + 1.0,
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

        // halt rollout
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
                                        percent: rolloutThreshold + 1.0,
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

        // resume rollout just of certain app versions
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            minSupportedVersion: '2030.12.25',
                            rollout: {
                                steps: [
                                    {
                                        percent: rolloutThreshold + 1.0,
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

        // resume rollout and update app version
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'disabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            minSupportedVersion: '2024.1.1',
                            rollout: {
                                steps: [
                                    {
                                        percent: rolloutThreshold + 1.0,
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

        // finish rollout
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            minSupportedVersion: '2024.1.1',
                            rollout: {
                                steps: [
                                    {
                                        percent: rolloutThreshold + 1.0,
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

        // remove steps
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            minSupportedVersion: '2024.1.1',
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
    });
});
