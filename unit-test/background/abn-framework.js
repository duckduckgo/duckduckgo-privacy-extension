import { buildLivePixelValidator, validateSinglePixel } from '@duckduckgo/pixel-schema';

import messageHandlers from '../../shared/js/background/message-handlers';
import RemoteConfig, { choseCohort } from '../../shared/js/background/components/remote-config';
import AbnExperimentMetrics, { getDateStringEST, startOfDayEST } from '../../shared/js/background/components/abn-experiments';
import load from '../../shared/js/background/load';
import commonParams from '../../pixel-definitions/params_dictionary.json';
import commonSuffixes from '../../pixel-definitions/suffixes_dictionary.json';
import productDef from '../../pixel-definitions/product.json';
import ignoreParams from '../../pixel-definitions/ignore_params.json';
import experimentPixels from '../data/native_experiments.json';
import { MockSettings } from '../helpers/mocks';

const ONE_HOUR_MS = 1000 * 60 * 60;

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

const pixelValidator = buildLivePixelValidator(commonParams, commonSuffixes, productDef, ignoreParams, {}, experimentPixels);

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
            pixelRequests.push(url);
        });
    });

    it('markExperimentEnrolled sends a correct pixel only once', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, subFeature);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        validateSinglePixel(pixelValidator, pixelRequests[0]);

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
        validateSinglePixel(pixelValidator, pixelRequests[1]);
    });

    it('onMetricTriggered can trigger multiple matching metrics', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, subFeature);
        // modify enrollment to be 6 days ago
        const cohort = remoteConfig.getCohort(feature, subFeature);
        // note use 25 hours so this does fall exactly on a day boundry (which could make the test non-deterministic)
        cohort.enrolledAt = Date.now() - ONE_HOUR_MS * 25 * 6;
        remoteConfig.setCohort(feature, subFeature, cohort);
        abnMetrics.onMetricTriggered('search');
        expect(pixelIntercept).toHaveBeenCalledTimes(3);
        const sentConversionWindows = pixelRequests
            .filter((u) => u.includes('/t/experiment_metrics_'))
            .map((u) => new URLSearchParams(u.split('?')[1]).get('conversionWindowDays'));
        expect(sentConversionWindows).toEqual(['6', '5-7']);
        validateSinglePixel(pixelValidator, pixelRequests[1]);
        validateSinglePixel(pixelValidator, pixelRequests[2]);
    });

    it('metric conversion window is inclusive of first and last days', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, subFeature);
        // modify enrollment to be 7 days ago
        const cohort = remoteConfig.getCohort(feature, subFeature);
        cohort.enrolledAt = Date.now() - ONE_HOUR_MS * 25 * 7;
        remoteConfig.setCohort(feature, subFeature, cohort);
        // trigger on day 5
        abnMetrics.onMetricTriggered('search', 1, Date.now() - ONE_HOUR_MS * 25 * 2);
        // trigger on day 7
        abnMetrics.onMetricTriggered('app_use', 1, Date.now());
        expect(pixelIntercept).toHaveBeenCalledTimes(5);
        const sentConversionWindows = pixelRequests
            .filter((u) => u.includes('/t/experiment_metrics_'))
            .map((u) => new URLSearchParams(u.split('?')[1]).get('conversionWindowDays'));
        expect(sentConversionWindows).toEqual(['5', '5-7', '7', '5-7']);
        pixelRequests.forEach((u) => {
            if (u.startsWith('/t/experiment_metrics_')) {
                validateSinglePixel(pixelValidator, u);
            }
        });
    });

    it('metric value count applies to conversion window only', () => {
        const { remoteConfig, abnMetrics } = constructMockComponents();
        remoteConfig.updateConfig(mockExperimentConfig);
        abnMetrics.markExperimentEnrolled(feature, subFeature, [
            {
                metric: 'search',
                conversionWindowStart: 5,
                conversionWindowEnd: 7,
                value: 4,
            },
            {
                metric: 'search',
                conversionWindowStart: 5,
                conversionWindowEnd: 5,
                value: 1,
            },
            {
                metric: 'search',
                conversionWindowStart: 5,
                conversionWindowEnd: 5,
                value: 2,
            },
        ]);
        // modify enrollment to be 7 days ago
        const cohort = remoteConfig.getCohort(feature, subFeature);
        cohort.enrolledAt = Date.now() - ONE_HOUR_MS * 25 * 7;
        remoteConfig.setCohort(feature, subFeature, cohort);
        pixelRequests.pop();
        // day 1 search
        abnMetrics.onMetricTriggered('search', 1, Date.now() - ONE_HOUR_MS * 25 * 6);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        // day 2 search
        abnMetrics.onMetricTriggered('search', 1, Date.now() - ONE_HOUR_MS * 25 * 5);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        // day 3 search
        abnMetrics.onMetricTriggered('search', 1, Date.now() - ONE_HOUR_MS * 25 * 4);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        // day 4 search
        abnMetrics.onMetricTriggered('search', 1, Date.now() - ONE_HOUR_MS * 25 * 3);
        expect(pixelIntercept).toHaveBeenCalledTimes(1);
        // day 5 search
        abnMetrics.onMetricTriggered('search', 1, Date.now() - ONE_HOUR_MS * 25 * 2);
        // value=1 metric was triggered on day 5
        expect(pixelIntercept).toHaveBeenCalledTimes(2);
        expect(pixelRequests.pop()).toContain('conversionWindowDays=5&value=1');
        // day 6 search x2
        abnMetrics.onMetricTriggered('search', 1, Date.now() - ONE_HOUR_MS * 25 * 1);
        abnMetrics.onMetricTriggered('search', 1, Date.now() - ONE_HOUR_MS * 25 * 1);
        expect(pixelIntercept).toHaveBeenCalledTimes(2);
        // day 7 search
        abnMetrics.onMetricTriggered('search', 1, Date.now());
        // value=4 metric triggers now
        expect(pixelIntercept).toHaveBeenCalledTimes(3);
        expect(pixelRequests.pop()).toContain('conversionWindowDays=5-7&value=4');
    });
});

describe('startOfDayEST', () => {
    it('always returns a timestamp in the past', () => {
        expect(startOfDayEST()).toBeLessThan(Date.now());
    });

    it('returns a timestamp corresponding to the start of the current day in ET', () => {
        const ts = new Date('2025-02-01T06:00:00');
        expect(new Date(startOfDayEST(ts))).toEqual(new Date('Feb 1 2025 00:00:00 UTC-0500'));
        ts.setUTCHours(23);
        expect(new Date(startOfDayEST(ts))).toEqual(new Date('Feb 1 2025 00:00:00 UTC-0500'));
    });

    it('handles day rollover', () => {
        const ts = new Date('2025-02-01T03:00:00');
        expect(new Date(startOfDayEST(ts))).toEqual(new Date('Jan 31 2025 00:00:00 UTC-0500'));
    });
});

describe('getDateStringEST', () => {
    it('returns a unix timestamp as the date in ET at that instant', () => {
        expect(getDateStringEST(new Date('2025-02-01T06:00:00'))).toEqual('2025-02-01');
        expect(getDateStringEST(new Date('2025-02-01T02:00:00'))).toEqual('2025-01-31');
    });
});
