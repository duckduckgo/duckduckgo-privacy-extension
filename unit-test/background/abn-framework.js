import { ParamsValidator } from '@duckduckgo/pixel-schema/src/params_validator.mjs';

import messageHandlers from '../../shared/js/background/message-handlers';
import RemoteConfig, { choseCohort } from '../../shared/js/background/components/remote-config';
import AbnExperimentMetrics from '../../shared/js/background/components/abn-experiments';
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

function constructMockComponents() {
    // clear message handlers to prevent conflict when registering
    Object.keys(messageHandlers).forEach((k) => delete messageHandlers[k]);
    const remoteConfig = new RemoteConfig({ settings: new MockSettings() });
    const abnMetrics = new AbnExperimentMetrics({ remoteConfig });
    return {
        remoteConfig,
        abnMetrics,
    };
}

const pixelValidator = new ParamsValidator(commonParams, commonSuffixes);

describe('choseCohort', () => {
    it('picks the only cohort if there is only one available', () => {
        const cohorts = [
            {
                name: 'control',
                weight: 1,
            },
        ];
        expect(choseCohort(cohorts, Math.random)).toEqual(cohorts[0]);
    });

    it('picks a cohort at random', () => {
        const cohorts = [
            {
                name: 'control',
                weight: 1,
            },
            {
                name: 'treatment',
                weight: 1,
            },
        ];
        const chosen = choseCohort(cohorts, Math.random);
        expect(chosen).not.toBeFalsy();
        expect(['control', 'treatment'].includes(chosen.name)).toBeTrue();
    });

    it('picks each cohort with 50% probability', () => {
        const cohorts = [
            {
                name: 'control',
                weight: 1,
            },
            {
                name: 'treatment',
                weight: 1,
            },
        ];
        const allocatedCohorts = { control: 0, treatment: 0 };
        for (let i = 0; i < 100; i++) {
            const chosen = choseCohort(cohorts, () => (0.5 + i) / 100);
            allocatedCohorts[chosen.name] += 1;
        }
        expect(allocatedCohorts).toEqual({
            control: 50,
            treatment: 50,
        });
    });

    it('picks from 3 cohorts correctly', () => {
        const cohorts = [
            {
                name: 'a',
                weight: 1,
            },
            {
                name: 'b',
                weight: 1,
            },
            {
                name: 'c',
                weight: 1,
            },
        ];
        const allocatedCohorts = { a: 0, b: 0, c: 0 };
        for (let i = 0; i < 100; i++) {
            const chosen = choseCohort(cohorts, () => (0.5 + i) / 100);
            allocatedCohorts[chosen.name] += 1;
        }
        expect(allocatedCohorts).toEqual({
            a: 33,
            b: 34,
            c: 33,
        });
    });

    it('picks from 2 unbalanced cohorts correctly', () => {
        const cohorts = [
            {
                name: 'a',
                weight: 3,
            },
            {
                name: 'b',
                weight: 1,
            },
        ];
        const allocatedCohorts = { a: 0, b: 0 };
        for (let i = 0; i < 100; i++) {
            const chosen = choseCohort(cohorts, () => (0.5 + i) / 100);
            allocatedCohorts[chosen.name] += 1;
        }
        expect(allocatedCohorts).toEqual({
            a: 75,
            b: 25,
        });
    });

    it('picks from 3 unbalanced cohorts correctly', () => {
        const cohorts = [
            {
                name: 'a',
                weight: 2,
            },
            {
                name: 'b',
                weight: 1,
            },
            {
                name: 'c',
                weight: 1,
            },
        ];
        const allocatedCohorts = { a: 0, b: 0, c: 0 };
        for (let i = 0; i < 100; i++) {
            const chosen = choseCohort(cohorts, () => (0.5 + i) / 100);
            allocatedCohorts[chosen.name] += 1;
        }
        expect(allocatedCohorts).toEqual({
            a: 50,
            b: 25,
            c: 25,
        });
    });
});

describe('ABN pixels', () => {
    const feature = 'testFeature';
    const subFeature = 'fooFeature';
    const mockExperimentConfig = {
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
    };
    let pixelRequests = [];
    let pixelIntercept = null;

    beforeEach(() => {
        pixelRequests = [];
        pixelIntercept = spyOn(load, 'url').and.callFake((url) => {
            const parsed = new URL(url);
            pixelRequests.push(parsed.pathname + parsed.search);
        });
    });

    it('markExperimentEnrolled sends a correct pixel only once', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, subFeature);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        expect(pixelValidator.validateLivePixels(experimentPixels['experiment.enroll'], 'experiment.enroll', pixelRequests[0])).toEqual([]);

        // call a second time: pixel shouldn't be triggered again
        abnMetrics.markExperimentEnrolled(feature, subFeature);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
    });

    it('markExperimentEnrolled with no metrics creates the default set', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, subFeature);
        expect(remoteConfig.getCohort(feature, subFeature).metrics.length).toEqual(38);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
    });

    it('markExperimentEnrolled sends no pixel if experiment does not exist', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, 'fooFeature2');
        expect(pixelIntercept).toHaveBeenCalledTimes(0);
    });

    it('onMetricTriggered triggers a metric pixel exactly once for an experiment', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, subFeature);
        abnMetrics.onMetricTriggered('search');
        abnMetrics.onMetricTriggered('search');
        // enrollment + metric pixels
        expect(pixelIntercept).toHaveBeenCalledTimes(2);
        expect(pixelRequests[1]).toContain('conversionWindowDays=0&');
        expect(pixelRequests[1]).toContain('value=1&');
        expect(pixelValidator.validateLivePixels(experimentPixels['experiment.metrics'], 'experiment.metrics', pixelRequests[1])).toEqual([]);
    });

    it('onMetricTriggered can trigger multiple matching metrics', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, subFeature);
        // modify enrollment to be 6 days ago
        const cohort = remoteConfig.getCohort(feature, subFeature);
        cohort.enrolledAt = Date.now() - 1000 * 60 * 60 * 25 * 6;
        remoteConfig.setCohort(feature, subFeature, cohort);
        abnMetrics.onMetricTriggered('search');
        expect(pixelIntercept).toHaveBeenCalledTimes(3);
        const sentConversionWindows = pixelRequests
            .filter((u) => u.startsWith('/t/experiment_metrics_'))
            .map((u) => new URLSearchParams(u.split('?')[1]).get('conversionWindowDays'));
        expect(sentConversionWindows).toEqual(['6', '5-7']);
        expect(pixelValidator.validateLivePixels(experimentPixels['experiment.metrics'], 'experiment.metrics', pixelRequests[1])).toEqual([]);
        expect(pixelValidator.validateLivePixels(experimentPixels['experiment.metrics'], 'experiment.metrics', pixelRequests[2])).toEqual([]);
    });

    it('metric conversion window is inclusive of first and last days', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, subFeature);
        // modify enrollment to be 7 days ago
        const cohort = remoteConfig.getCohort(feature, subFeature);
        cohort.enrolledAt = Date.now() - 1000 * 60 * 60 * 25 * 7;
        remoteConfig.setCohort(feature, subFeature, cohort);
        // trigger on day 5
        abnMetrics.onMetricTriggered('search', 1, Date.now() - 1000 * 60 * 60 * 25 * 2);
        // trigger on day 7
        abnMetrics.onMetricTriggered('app_use', 1, Date.now());
        expect(pixelIntercept).toHaveBeenCalledTimes(5);
        const sentConversionWindows = pixelRequests
            .filter((u) => u.startsWith('/t/experiment_metrics_'))
            .map((u) => new URLSearchParams(u.split('?')[1]).get('conversionWindowDays'));
        expect(sentConversionWindows).toEqual(['5', '5-7', '7', '5-7']);
        pixelRequests.forEach((u) => {
            if (u.startsWith('/t/experiment_metrics_')) {
                expect(pixelValidator.validateLivePixels(experimentPixels['experiment.metrics'], 'experiment.metrics', u)).toEqual([]);
            }
        })
    });

    it('metric value count applies to conversion window only', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, subFeature, [{
            metric: 'search',
            conversionWindowStart: 5,
            conversionWindowEnd: 7,
            value: 4
        }, {
            metric: 'search',
            conversionWindowStart: 5,
            conversionWindowEnd: 5,
            value: 1
        }, {
            metric: 'search',
            conversionWindowStart: 5,
            conversionWindowEnd: 5,
            value: 2
        }]);
        // modify enrollment to be 7 days ago
        const cohort = remoteConfig.getCohort(feature, subFeature);
        cohort.enrolledAt = Date.now() - 1000 * 60 * 60 * 25 * 7;
        remoteConfig.setCohort(feature, subFeature, cohort);
        pixelRequests.pop()
        // day 1 search
        abnMetrics.onMetricTriggered('search', 1, Date.now() - 1000 * 60 * 60 * 25 * 6);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        // day 2 search
        abnMetrics.onMetricTriggered('search', 1, Date.now() - 1000 * 60 * 60 * 25 * 5);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        // day 3 search
        abnMetrics.onMetricTriggered('search', 1, Date.now() - 1000 * 60 * 60 * 25 * 4);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        // day 4 search
        abnMetrics.onMetricTriggered('search', 1, Date.now() - 1000 * 60 * 60 * 25 * 3);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        // day 5 search
        abnMetrics.onMetricTriggered('search', 1, Date.now() - 1000 * 60 * 60 * 25 * 2);
        // value=1 metric was triggered on day 5
        expect(pixelIntercept).toHaveBeenCalledTimes(2);
        expect(pixelRequests.pop()).toContain('conversionWindowDays=5&value=1')
        // day 6 search x2
        abnMetrics.onMetricTriggered('search', 1, Date.now() - 1000 * 60 * 60 * 25 * 1);
        abnMetrics.onMetricTriggered('search', 1, Date.now() - 1000 * 60 * 60 * 25 * 1);
        expect(pixelIntercept).toHaveBeenCalledTimes(2);
        // day 7 search
        abnMetrics.onMetricTriggered('search', 1, Date.now());
        // value=4 metric triggers now
        expect(pixelIntercept).toHaveBeenCalledTimes(3);
        expect(pixelRequests.pop()).toContain('conversionWindowDays=5-7&value=4')
    });
});
