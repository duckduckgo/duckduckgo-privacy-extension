import browser from 'webextension-polyfill';
import { ParamsValidator } from '@duckduckgo/pixel-schema/src/params_validator.mjs';

import RemoteConfig from '../../shared/js/background/components/remote-config';
import messageHandlers from '../../shared/js/background/message-handlers';
import load from '../../shared/js/background/load';
import commonParams from '../../pixel-definitions/common_params.json';
import commonSuffixes from '../../pixel-definitions/common_suffixes.json';
import experimentPixels from '../../pixel-definitions/pixels/experiments.json';

class MockSettings {
    constructor() {
        this.mockSettingData = new Map();
        this.ready = () => Promise.resolve();
    }

    getSetting(key) {
        return structuredClone(this.mockSettingData.get(key));
    }
    updateSetting(key, value) {
        this.mockSettingData.set(key, value);
    }
}

function constructMockRemoteConfig() {
    // clear message handlers to prevent conflict when registering
    Object.keys(messageHandlers).forEach((k) => delete messageHandlers[k]);
    return new RemoteConfig({ settings: new MockSettings() });
}

const pixelValidator = new ParamsValidator(commonParams, commonSuffixes);

describe('rollouts', () => {
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
        let mockExtensionVersion = '2024.10.12';
        spyOn(browser.runtime, 'getManifest').and.callFake(() => ({
            version: mockExtensionVersion,
        }));
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
                            minSupportedVersion: '2024.12.25',
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
        mockExtensionVersion = '2024.12.25';
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'disabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            minSupportedVersion: '2024.12.25',
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
                            minSupportedVersion: '2024.12.25',
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
                            minSupportedVersion: '2024.12.25',
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
    });
});

describe('targets', () => {
    it('test feature with multiple targets matching', () => {
        spyOn(browser.i18n, 'getUILanguage').and.returnValue('fr-US');
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            targets: [
                                {
                                    localeCountry: 'US',
                                    localeLanguage: 'fr',
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
    });

    it('test multiple languages', () => {
        spyOn(browser.i18n, 'getUILanguage').and.returnValue('fr-US');
        const config = constructMockRemoteConfig();
        const configDataWithTargets = {
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            targets: [
                                {
                                    localeCountry: 'US',
                                    localeLanguage: 'en',
                                },
                                {
                                    localeCountry: 'FR',
                                    localeLanguage: 'fr',
                                },
                            ],
                        },
                    },
                },
            },
        };
        config.updateConfig(configDataWithTargets);
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();

        config.targetEnvironment.localeCountry = 'US';
        config.targetEnvironment.localeLanguage = 'en';
        config.updateConfig(configDataWithTargets);
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();

        config.targetEnvironment.localeCountry = 'FR';
        config.targetEnvironment.localeLanguage = 'fr';
        config.updateConfig(configDataWithTargets);
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
    });

    it('test feature with multiple targets not matching', () => {
        spyOn(browser.i18n, 'getUILanguage').and.returnValue('fr-FR');
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            targets: [
                                {
                                    localeCountry: 'US',
                                    localeLanguage: 'fr',
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
    });

    it('test feature with multiple separate targets matching', () => {
        spyOn(browser.i18n, 'getUILanguage').and.returnValue('fr-US');
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            targets: [
                                {
                                    variantKey: 'mc',
                                },
                                {
                                    localeCountry: 'US',
                                },
                                {
                                    localeLanguage: 'fr',
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
    });

    it('test feature with multiple separate targets not matching', () => {
        spyOn(browser.i18n, 'getUILanguage').and.returnValue('fr-FR');
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                            targets: [
                                {
                                    variantKey: 'mc',
                                },
                                {
                                    localeCountry: 'US',
                                },
                                {
                                    localeLanguage: 'zh',
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
    });

    it('test variant parsing when no remote variant provided', () => {
        const config = constructMockRemoteConfig();
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'enabled',
                    features: {
                        fooFeature: {
                            state: 'enabled',
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
    });

    it('test rollout roll back', () => {
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

        const fooFeatureRolloutPercentile = config.settings.getSetting('rollouts.testFeature.fooFeature.roll');
        const justEnableRollout = Math.min(fooFeatureRolloutPercentile + 1, 100.0);
        const justDisabledRollout = Math.max(fooFeatureRolloutPercentile - 1, 0.0);

        // Roll back to 0% but as fooFeature was enabled before it should remain enabled
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

        // Disable fooFeature, should disable the feature
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
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();

        // Roll fooFeature back to 100% with state still disabled, should remain disabled
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

        // re-enable fooFeature, should be enabled
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

        // disable feature
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

        // re-enable but roll back, should disable fooFeature
        config.updateConfig({
            features: {
                testFeature: {
                    state: 'disabled',
                    features: {
                        fooFeature: {
                            state: 'enable',
                            rollout: {
                                steps: [
                                    {
                                        percent: justDisabledRollout,
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

        // roll out just enough, should enable fooFeature
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
                                        percent: justEnableRollout,
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
});

describe('cohorts', () => {
    it('test cohort is assigned automatically', () => {
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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isFeatureEnabled('testFeature')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');
    });

    it('test remove all cohorts remotely removes assigned cohort', () => {
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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');

        // remove blue cohort
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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');

        // remove all remaining cohorts
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
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual(null);
    });

    it('test disabling feature disables cohort', () => {
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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'control')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'blue')).toBeFalse();

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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'control')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'blue')).toBeFalse();

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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'control')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'blue')).toBeFalse();
    });

    it('test cohort targets', () => {
        spyOn(browser.i18n, 'getUILanguage').and.returnValue('fr-US');
        const config = constructMockRemoteConfig();

        const targettedConfig = {
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
                            targets: [
                                {
                                    localeLanguage: 'fr',
                                    localeCountry: 'FR',
                                },
                            ],
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        };
        config.updateConfig(targettedConfig);
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual(null);

        config.targetEnvironment.localeCountry = 'FR';
        config.targetEnvironment.localeLanguage = 'us';
        config.updateConfig(targettedConfig);
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual(null);

        config.targetEnvironment.localeCountry = 'US';
        config.targetEnvironment.localeLanguage = 'en';
        config.updateConfig(targettedConfig);
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual(null);

        config.targetEnvironment.localeCountry = 'FR';
        config.targetEnvironment.localeLanguage = 'fr';
        config.updateConfig(targettedConfig);
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');

        // once cohort is assigned, changing targets shall not affect feature state
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
                            targets: [
                                {
                                    localeCountry: 'FR',
                                },
                            ],
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');

        // remove all cohorts to clean state
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
                            targets: [
                                {
                                    localeCountry: 'FR',
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual(null);

        // re-populate experiment to re-assign new cohort, should be assigned to blue
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
                            targets: [
                                {
                                    localeCountry: 'FR',
                                },
                            ],
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 0,
                                },
                                {
                                    name: 'blue',
                                    weight: 1,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        // TODO: what is the correct assertion here?
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'control')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'blue')).toBeTrue();
    });

    it('test change remote cohorts after assignment should noop', () => {
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
                            targets: [
                                {
                                    localeCountry: 'US',
                                },
                            ],
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');

        // changing cohort targets should not change cohort assignment
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
                            targets: [
                                {
                                    localeCountry: 'FR',
                                },
                            ],
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');

        // changing cohort weight should not change current assignment
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
                            targets: [
                                {
                                    localeCountry: 'US',
                                },
                            ],
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 0,
                                },
                                {
                                    name: 'blue',
                                    weight: 1,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');

        // adding cohorts should not change current assignment
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
                            targets: [
                                {
                                    localeCountry: 'US',
                                },
                            ],
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 1,
                                },
                                {
                                    name: 'red',
                                    weight: 1,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');
    });

    it('test enrollment date', () => {
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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');
        expect(config.getCohort('testFeature', 'fooFeature').assignedAt).toBeGreaterThan(Date.now() - 1000);
        expect(config.getCohort('testFeature', 'fooFeature').enrolledAt).toBeFalsy();
    });

    it('test rollback cohort experiments', () => {
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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        const rolloutThreshold = config.settings.getSetting('rollouts.testFeature.fooFeature.roll');
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'control')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'blue')).toBeFalse();

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
                                        percent: rolloutThreshold - 1,
                                    },
                                ],
                            },
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'control')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'blue')).toBeFalse();
    });

    it('test cohort enabled and stop enrollment and then roll-back', () => {
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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'control')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'blue')).toBeFalse();

        // Stop enrollment, should keep assigned cohorts
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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 0,
                                },
                                {
                                    name: 'blue',
                                    weight: 1,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        // when weight of assigned cohort goes down to "0" we just stop the enrollment, but keep the cohort assignment
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('control');
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'control')).toBeTrue();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'blue')).toBeFalse();

        // remove control, should re-allocate to blue
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
                            cohorts: [
                                {
                                    name: 'blue',
                                    weight: 1,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeTrue();
        expect(config.getCohortName('testFeature', 'fooFeature')).toEqual('blue');
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'control')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'blue')).toBeTrue();

        // roll-back
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
                                        percent: 0,
                                    },
                                ],
                            },
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 0,
                                },
                                {
                                    name: 'blue',
                                    weight: 1,
                                },
                            ],
                        },
                    },
                },
            },
        });
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'control')).toBeFalse();
        expect(config.isSubFeatureEnabled('testFeature', 'fooFeature', 'blue')).toBeFalse();
    });
});

describe('ABN pixels', () => {
    it('markExperimentEnrolled sends a correct pixel only once', () => {
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
                            cohorts: [
                                {
                                    name: 'control',
                                    weight: 1,
                                },
                                {
                                    name: 'blue',
                                    weight: 0,
                                },
                            ],
                        },
                    },
                },
            },
        });

        let pixelRequest = '';
        const pixelIntercept = spyOn(load, 'url').and.callFake((url) => {
            const parsed = new URL(url);
            pixelRequest = parsed.pathname + parsed.search;
        });
        config.markExperimentEnrolled('testFeature', 'fooFeature');
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        expect(pixelValidator.validateLivePixels(experimentPixels['experiment.enroll'], 'experiment.enroll', pixelRequest)).toEqual([]);

        // call a second time: pixel shouldn't be triggered again
        config.markExperimentEnrolled('testFeature', 'fooFeature');
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
    });
});
